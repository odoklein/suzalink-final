export const FICHE_HYGIENE_ALIMENTAIRE_TYPE = "fiche_hygiene_alimentaire_opco";

export interface FicheApprenant {
    nomUsage: string;
    prenom: string;
    dateNaissance: string;
    numeroSecuriteSociale: string;
    email: string;
    telephone: string;
    ancienneteEntreprise: string;
    typeContrat: string;
}

export interface FicheHygieneAlimentaireData {
    _type: typeof FICHE_HYGIENE_ALIMENTAIRE_TYPE;
    _version: 1;
    collaborateurCnf: string;
    date: string;
    restaurateur: {
        nomPrenom: string;
        dateNaissance: string;
        adressePersonnelle: string;
        telephone: string;
        email: string;
    };
    etablissement: {
        nom: string;
        adresseComplete: string;
        siret: string;
        codeApe: string;
        typeActivite: string;
        nomDirigeant: string;
        emailContactAdmin: string;
        telephoneContactAdmin: string;
    };
    apprenants: FicheApprenant[];
    objectif: {
        intitule: string;
        objectif: string;
        publicVise: string;
    };
    session: {
        organisme: string;
        duree: string;
        datesSouhaitees: string;
        lieu: string;
        coutPedagogique: string;
    };
    opco: {
        rattachement: string;
        numeroIdcc: string;
        typeFinancement: string;
        piecesJointes: string;
    };
    signature: {
        nomFonction: string;
        date: string;
        signature: string;
    };
    observations: string;
}

export function emptyApprenant(): FicheApprenant {
    return {
        nomUsage: "",
        prenom: "",
        dateNaissance: "",
        numeroSecuriteSociale: "",
        email: "",
        telephone: "",
        ancienneteEntreprise: "",
        typeContrat: "",
    };
}

export function emptyFicheHygieneAlimentaire(): FicheHygieneAlimentaireData {
    return {
        _type: FICHE_HYGIENE_ALIMENTAIRE_TYPE,
        _version: 1,
        collaborateurCnf: "",
        date: new Date().toISOString().slice(0, 10),
        restaurateur: {
            nomPrenom: "",
            dateNaissance: "",
            adressePersonnelle: "",
            telephone: "",
            email: "",
        },
        etablissement: {
            nom: "",
            adresseComplete: "",
            siret: "",
            codeApe: "",
            typeActivite: "",
            nomDirigeant: "",
            emailContactAdmin: "",
            telephoneContactAdmin: "",
        },
        apprenants: [emptyApprenant()],
        objectif: {
            intitule: "Formation Hygiène Alimentaire",
            objectif:
                "Mise en conformité réglementaire et amélioration des pratiques d'hygiène en restauration",
            publicVise: "Restaurateur / personnel manipulant des denrées alimentaires",
        },
        session: {
            organisme: "CENTRE NATIONAL DE FORMATIONS",
            duree: "",
            datesSouhaitees: "",
            lieu: "",
            coutPedagogique: "",
        },
        opco: {
            rattachement: "",
            numeroIdcc: "",
            typeFinancement: "",
            piecesJointes: "Devis de l'organisme de formation CONVENTION ; Programme détaillé",
        },
        signature: {
            nomFonction: "",
            date: "",
            signature: "",
        },
        observations: "",
    };
}

export function isFicheHygieneAlimentaireContent(
    raw: string
): FicheHygieneAlimentaireData | null {
    if (!raw || !raw.trim().startsWith("{")) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed._type === FICHE_HYGIENE_ALIMENTAIRE_TYPE) {
            return parsed as FicheHygieneAlimentaireData;
        }
    } catch {
        return null;
    }
    return null;
}

export const MAX_APPRENANTS = 7;
