import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../utils/database';
import { broadcast } from '../../utils/broadcast';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name: string = req.body.name;
  let value: string | undefined = undefined;

  if (req.body.value !== undefined) {
    if (typeof req.body.value === 'object') value = JSON.stringify(req.body.value);
    else value = String(req.body.value);
  }

  if (!name || value === undefined) {
    res.status(400).end();
    return;
  }

  await prisma.config.upsert({
    where: { name },
    update: { value },
    create: { name, value },
  });

  res.end();

  if (name === 'environment') {
    broadcast('environmentChange', { value });
  }
}
