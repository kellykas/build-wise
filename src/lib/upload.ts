/**
 * Shared helpers for storage/RLS aware uploads.
 * Pure functions here are covered by automated tests.
 */

export type UploadStage = "storage" | "database";

export type UploadDiagnosis = {
  /** Short, human readable message shown in the toast title. */
  message: string;
  /** Actionable next step for the user. */
  hint: string;
  /** True when the failure is a permission problem (RLS / storage policy). */
  permission: boolean;
};

const RLS_MARKERS = [
  "row-level security",
  "row level security",
  "violates row-level security",
  "new row violates",
];

const STORAGE_POLICY_MARKERS = [
  "unauthorized",
  "not authorized",
  "permission denied",
  "access denied",
  "403",
];

/**
 * Turn a raw Supabase storage/postgrest error into a clear, actionable message.
 */
export function diagnoseUploadError(
  error: { message?: string; statusCode?: string | number; status?: number } | null | undefined,
  stage: UploadStage,
): UploadDiagnosis {
  const raw = (error?.message ?? "").toString();
  const lower = raw.toLowerCase();
  const status = String(error?.statusCode ?? error?.status ?? "");

  if (RLS_MARKERS.some((m) => lower.includes(m))) {
    return {
      permission: true,
      message: "Autorisation refusée : les règles de sécurité bloquent cet enregistrement.",
      hint:
        stage === "database"
          ? "Vérifiez que vous êtes bien rattaché à ce projet (Projet → Agents attachés) et que votre espace de travail est configuré, puis réessayez."
          : "Votre rôle n'autorise pas l'écriture dans ce dossier. Demandez à un administrateur de vous ajouter au projet.",
    };
  }

  if (lower.includes("bucket not found")) {
    return {
      permission: false,
      message: "Espace de stockage introuvable.",
      hint: "Contactez un administrateur : le bucket « documents » n'est pas disponible.",
    };
  }

  if (lower.includes("already exists") || lower.includes("duplicate")) {
    return {
      permission: false,
      message: "Un fichier portant ce nom existe déjà.",
      hint: "Renommez le fichier puis réessayez.",
    };
  }

  if (lower.includes("exceeded") || lower.includes("too large") || status === "413") {
    return {
      permission: false,
      message: "Fichier trop volumineux.",
      hint: "Compressez l'image ou choisissez un fichier plus léger (max ~50 Mo).",
    };
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return {
      permission: false,
      message: "Connexion interrompue pendant le téléversement.",
      hint: "Vérifiez votre connexion internet et relancez le téléversement.",
    };
  }

  if (STORAGE_POLICY_MARKERS.some((m) => lower.includes(m)) || status === "403" || status === "401") {
    return {
      permission: true,
      message: "Accès au stockage refusé pour votre rôle.",
      hint: "Reconnectez-vous, puis demandez à un administrateur de vérifier vos rôles (Paramètres → Upload checks).",
    };
  }

  return {
    permission: false,
    message: raw || "Le téléversement a échoué.",
    hint: "Réessayez. Si le problème persiste, ouvrez Paramètres → Upload checks pour diagnostiquer vos permissions.",
  };
}

/** Sanitize a filename so it is safe as a storage object key. */
export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Build the company-scoped storage path expected by the storage policies. */
export function buildStoragePath(opts: {
  companyId: string;
  projectId?: string | null;
  folder: string;
  fileName: string;
  now?: number;
}): string {
  const segment = opts.projectId ?? "general";
  const ts = opts.now ?? Date.now();
  return `${opts.companyId}/${segment}/${opts.folder}/${ts}-${safeFileName(opts.fileName)}`;
}

/** Storage path for client portal progress photos. */
export function buildProgressPhotoPath(opts: {
  companyId: string;
  projectId: string;
  fileName: string;
  now?: number;
}): string {
  const ts = opts.now ?? Date.now();
  return `${opts.companyId}/${opts.projectId}/progress/${ts}-${safeFileName(opts.fileName)}`;
}

export type GalleryItem = { name: string; created_at: string };
export type GallerySort = "newest" | "oldest" | "name";

export function sortGallery<T extends GalleryItem>(items: T[], sort: GallerySort): T[] {
  const copy = [...items];
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return sort === "newest" ? copy.reverse() : copy;
}
