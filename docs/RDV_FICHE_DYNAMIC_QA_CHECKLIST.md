# RDV Fiche Dynamique - QA Checklist

## Pre-requis
- SQL migration `prisma/migrations/20260410120000_add_fiche_template/migration.sql` executed manually.
- Application restarted after schema update.

## SDR / Booking
- Create a RDV from the existing booking flow.
- Verify RDV is created even if fiche is empty.
- Verify no regression on meeting type/date/notes.

## Commercial Portal
- Open `/commercial/portal/meetings`.
- Verify badge `Fiche manquante` appears on meetings without fiche.
- Click `Compléter la fiche`, fill required fields, save.
- Verify success toast and badge updates to `Fiche complétée` without refresh.
- Verify `Fiche manquante` filter only shows meetings where fiche is empty.

## Template Fallback
- Create a default template (clientId null, missionId null) and verify it is used.
- Create a client-scoped template and verify it overrides default for that client.
- Create a mission-scoped template and verify it overrides client template for that mission.

## Validation
- Submit fiche with missing required field: verify field error is shown.
- Submit invalid type (`number` field with text): verify validation error.
- Submit unknown keys manually (API): verify they are safely ignored by backend policy.

## Manager Configuration
- Open `/manager/settings/fiche-templates`.
- Create a template, add fields, reorder fields, mark required/active.
- Save and reload page: verify persisted configuration.
- Delete non-default template: verify removal.
- Attempt deleting default template: verify protected behavior.

## Regression
- Commercial feedback submission still works.
- Meeting cancellation flow still works.
- Existing RDV list loading and filters still work.
