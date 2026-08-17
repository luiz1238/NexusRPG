import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const playerData = await prisma.player.findUnique({
    where: { id: player.id },
    select: {
      id: true,
      name: true,
      maxLoad: true,
      spellSlots: true,
      PlayerAttribute: {
        orderBy: { attributeId: 'asc' }, // Ordena os Atributos pelo ID de criação no Editor
        select: {
          value: true,
          maxValue: true,
          show: true,
          Attribute: true,
        },
      },
      PlayerAttributeStatus: {
        orderBy: { attributeStatusId: 'asc' }, // Ordena os Status de Atributo
        select: {
          value: true,
          AttributeStatus: true,
        },
      },
      PlayerCharacteristic: {
        orderBy: { characteristicId: 'asc' }, // Ordena as Características na ordem do Editor
        select: {
          value: true,
          Characteristic: true,
        },
      },
      PlayerCurrency: {
        orderBy: { currencyId: 'asc' }, // Ordena as Moedas
        select: {
          value: true,
          Currency: true,
        },
      },
      PlayerEquipment: {
        orderBy: { equipmentId: 'asc' }, // Ordena os Equipamentos
        select: {
          currentAmmo: true,
          Equipment: true,
        },
      },
      PlayerExtraInfo: {
        orderBy: { extraInfoId: 'asc' }, // Ordena as Informações Extras
        select: {
          value: true,
          ExtraInfo: true,
        },
      },
      PlayerInfo: {
        orderBy: { infoId: 'asc' }, // Ordena as Informações
        select: {
          value: true,
          Info: true,
        },
      },
      PlayerItem: {
        orderBy: { itemId: 'asc' }, // Ordena os Itens
        select: {
          quantity: true,
          currentDescription: true,
          Item: true,
        },
      },
      PlayerSkill: {
        orderBy: { skillId: 'asc' }, // Ordena as Perícias
        select: {
          value: true,
          checked: true,
          Skill: true,
        },
      },
      PlayerSpec: {
        orderBy: { specId: 'asc' }, // Ordena as Especializações/Especialidades
        select: {
          value: true,
          Spec: true,
        },
      },
      PlayerSpell: {
        orderBy: { spellId: 'asc' }, // Ordena os Rituais/Magias
        select: {
          Spell: true,
        },
      },
    },
  });

  res.send({ player: playerData });
}

export default sessionAPI(handler);
