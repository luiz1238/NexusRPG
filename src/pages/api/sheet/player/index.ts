import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast'; // Necessário para avisar o mestre em tempo real

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  // MÉTODO GET: CARREGA A FICHA DO JOGADOR
  if (req.method === 'GET') {
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
    return;
  }

  // MÉTODO POST: ATUALIZA NOME, CAPACIDADE DE CARGA E SLOTS
  if (req.method === 'POST') {
    const npcId: number | undefined = req.body.npcId;
    let playerId = player.id;

    // Se for o admin a editar um NPC
    if (player.admin && npcId) {
      playerId = npcId;
    }

    const { name, showName, maxLoad, spellSlots } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (showName !== undefined) data.showName = showName;
    if (maxLoad !== undefined) data.maxLoad = maxLoad;
    if (spellSlots !== undefined) data.spellSlots = spellSlots;

    await prisma.player.update({
      where: { id: playerId },
      data,
    });

    res.end();

    // Avisa o painel do mestre para mudar ao vivo
    if (name !== undefined) broadcast('playerNameChange', { playerId, value: name });
    if (maxLoad !== undefined) broadcast('playerMaxLoadChange', { playerId, newLoad: maxLoad });
    if (spellSlots !== undefined) broadcast('playerSpellSlotsChange', { playerId, newSpellSlots: spellSlots });

    return;
  }

  // MÉTODO DELETE: PERMITE AO MESTRE APAGAR UM JOGADOR
  if (req.method === 'DELETE') {
    if (!player.admin) {
      res.status(401).end();
      return;
    }
    const id: number | undefined = req.body.id;
    if (id) {
      await prisma.player.delete({ where: { id } });
    }
    res.end();
    return;
  }

  // Se a requisição for feita através de qualquer outro método não previsto
  res.status(405).end();
}

export default sessionAPI(handler);
