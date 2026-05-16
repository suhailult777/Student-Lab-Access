import { handlePrototypeApi } from "./_lib/prototype-api";

export default async function handler(req: any, res: any): Promise<void> {
  await handlePrototypeApi(req, res);
}
