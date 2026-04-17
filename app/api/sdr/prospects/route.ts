import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireRole,
  withErrorHandler,
} from "@/lib/api-utils";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await requireRole(["SDR", "BOOKER", "BUSINESS_DEVELOPER", "MANAGER"], request);
  const sp = new URL(request.url).searchParams;
  const missionId = sp.get("missionId");

  const assignedMissions = await prisma.mission.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      ...(missionId ? { id: missionId } : {}),
      ...(session.user.role === "MANAGER" ? {} : {
        campaigns: { some: { sdrAssignments: { some: { sdrId: session.user.id } } } },
      }),
    },
    select: {
      id: true,
      name: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const missionIds = assignedMissions.map((m) => m.id);
  if (missionIds.length === 0) {
    return successResponse({ missions: [], rows: [] });
  }

  const contacts = await prisma.contact.findMany({
    where: {
      company: {
        list: {
          missionId: { in: missionIds },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          list: {
            select: {
              id: true,
              name: true,
              missionId: true,
              mission: {
                select: {
                  id: true,
                  name: true,
                  client: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    take: 3000,
  });

  const contactIds = contacts.map((c) => c.id);
  const companyIds = contacts.map((c) => c.company.id);

  const [actions, formulaires] = await Promise.all([
    prisma.action.findMany({
      where: {
        contactId: { in: contactIds },
        campaign: { missionId: { in: missionIds } },
        ...(session.user.role === "MANAGER" ? {} : { sdrId: session.user.id }),
      },
      select: {
        id: true,
        contactId: true,
        campaign: { select: { missionId: true } },
        result: true,
        createdAt: true,
        callbackDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6000,
    }),
    prisma.formulaire.findMany({
      where: {
        missionId: { in: missionIds },
        OR: [
          { contactId: { in: contactIds } },
          { companyId: { in: companyIds } },
        ],
      },
      select: {
        id: true,
        missionId: true,
        contactId: true,
        companyId: true,
        status: true,
        sentToEmail: true,
        sentAt: true,
        signedAt: true,
        title: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6000,
    }),
  ]);

  const latestActionByContactMission = new Map<string, (typeof actions)[number]>();
  for (const action of actions) {
    if (!action.contactId) continue;
    const key = `${action.contactId}:${action.campaign.missionId}`;
    if (!latestActionByContactMission.has(key)) {
      latestActionByContactMission.set(key, action);
    }
  }

  const latestFormByTargetMission = new Map<string, (typeof formulaires)[number]>();
  for (const f of formulaires) {
    const contactKey = f.contactId ? `c:${f.contactId}:${f.missionId}` : null;
    const companyKey = f.companyId ? `co:${f.companyId}:${f.missionId}` : null;
    if (contactKey && !latestFormByTargetMission.has(contactKey)) {
      latestFormByTargetMission.set(contactKey, f);
    }
    if (companyKey && !latestFormByTargetMission.has(companyKey)) {
      latestFormByTargetMission.set(companyKey, f);
    }
  }

  const rows = contacts.map((contact) => {
    const m = contact.company.list.mission;
    const missionRowId = m.id;
    const action = latestActionByContactMission.get(`${contact.id}:${missionRowId}`) ?? null;
    const form =
      latestFormByTargetMission.get(`c:${contact.id}:${missionRowId}`) ??
      latestFormByTargetMission.get(`co:${contact.company.id}:${missionRowId}`) ??
      null;

    const fullName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    return {
      id: `${missionRowId}:${contact.id}`,
      mission: { id: m.id, name: m.name },
      client: m.client,
      list: { id: contact.company.list.id, name: contact.company.list.name },
      company: {
        id: contact.company.id,
        name: contact.company.name,
        industry: contact.company.industry,
      },
      contact: {
        id: contact.id,
        fullName: fullName || "Contact inconnu",
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
      },
      call: action
        ? {
            called: true,
            actionId: action.id,
            result: action.result,
            calledAt: action.createdAt,
            callbackDate: action.callbackDate,
          }
        : {
            called: false,
            actionId: null,
            result: null,
            calledAt: null,
            callbackDate: null,
          },
      formulaire: form
        ? {
            id: form.id,
            title: form.title,
            status: form.status,
            sentToEmail: form.sentToEmail,
            sentAt: form.sentAt,
            signedAt: form.signedAt,
          }
        : null,
    };
  });

  return successResponse({
    missions: assignedMissions,
    rows,
  });
});
