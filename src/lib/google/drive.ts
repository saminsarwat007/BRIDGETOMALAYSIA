import "server-only";
import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";

let cachedClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (cachedClient) return cachedClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Google service account credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY."
    );
  }

  // Support both raw newlines and escaped \n
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  cachedClient = google.drive({ version: "v3", auth });
  return cachedClient;
}

/**
 * Find or create a subfolder named `name` inside `parentId`.
 * Returns the subfolder ID.
 */
export async function ensureSubfolder(parentId: string, name: string): Promise<string> {
  const drive = getDriveClient();

  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const list = await drive.files.list({
    q,
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id!;
}

interface UploadOptions {
  folderId: string;
  fileName: string;
  mimeType: string;
  body: Buffer | Readable;
  makeAnyoneReader?: boolean;
}

export interface UploadedFile {
  id: string;
  webViewLink: string;
  webContentLink?: string;
  name: string;
}

export async function uploadToDrive(opts: UploadOptions): Promise<UploadedFile> {
  const drive = getDriveClient();

  const media = {
    mimeType: opts.mimeType,
    body: opts.body instanceof Buffer ? Readable.from(opts.body) : opts.body,
  };

  const created = await drive.files.create({
    requestBody: {
      name: opts.fileName,
      parents: [opts.folderId],
    },
    media,
    fields: "id, name, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  // Make readable by anyone with the link so the student can open from tracking page
  if (opts.makeAnyoneReader ?? true) {
    try {
      await drive.permissions.create({
        fileId: created.data.id!,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      });
    } catch {
      // Some Workspace policies block this; safe to ignore.
    }
  }

  return {
    id: created.data.id!,
    webViewLink: created.data.webViewLink ?? "",
    webContentLink: created.data.webContentLink ?? undefined,
    name: created.data.name ?? opts.fileName,
  };
}

export async function getFolderMetadata(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: folderId,
    fields: "id, name, webViewLink, mimeType",
    supportsAllDrives: true,
  });
  return res.data;
}
