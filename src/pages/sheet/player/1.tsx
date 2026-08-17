//Antes Deus e eu sabíamos o que fiz, hoje só ele sabe(NÃO OUSE MEXER NESSE CODIGO...)
//(Mas a inteligência artificial precisou fazer um pequeno milagre aqui)

import type { GetServerSidePropsContext } from 'next';
import Router from 'next/router';
import { useEffect } from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import ApplicationHead from '../../../components/ApplicationHead';
import DataContainer from '../../../components/DataContainer';
import ErrorToastContainer from '../../../components/ErrorToastContainer';
import PlayerAttributeContainer from '../../../components/Player/PlayerAttributeContainer';
import PlayerCharacteristicContainer from '../../../components/Player/PlayerCharacteristicContainer';
import PlayerEquipmentContainer from '../../../components/Player/PlayerEquipmentContainer';
import PlayerInfoContainer from '../../../components/Player/PlayerInfoContainer';
import PlayerItemContainer from '../../../components/Player/PlayerItemContainer';
import PlayerSkillContainer from '../../../components/Player/PlayerSkillContainer';
import PlayerSpecField from '../../../components/Player/PlayerSpecField';
import PlayerSpellContainer from '../../../components/Player/PlayerSpellContainer';
import { ErrorLogger, Realtime } from '../../../contexts';
import useRealtime from '../../../hooks/useRealtime';
import useToast from '../../../hooks/useToast';
import type { InferSSRProps } from '../../../utils';
import api from '../../../utils/api';
import type { DiceConfig } from '../../../utils/config';
import prisma from '../../../utils/database';
import { sessionSSR } from '../../../utils/session';

type PageProps = InferSSRProps<typeof getSSP>;

export default function Page(props: PageProps) {
	return (
		<>
			<ApplicationHead title='Ficha do Personagem' />
			<PlayerSheet {...props} />
		</>
	);
}

function PlayerSheet(props: PageProps) {
	if (!props || !props.player) {
		return (
			<Container className='text-center mt-5'>
				<h2 style={{ color: '#8a2be2' }}>Ficha Não Encontrada.</h2>
				<p>Houve um erro de sincronização com o banco de dados.</p>
				<Button variant="secondary" onClick={() => Router.push('/')}>Voltar ao Início</Button>
			</Container>
		);
	}

  const [toasts, addToast] = useToast();
  const { on, ready } = useRealtime();

  useEffect(() => {
    // INTERCEPTADOR: Pega o ID da URL se o Mestre estiver acessando a ficha de um jogador
    const queryParams = new URLSearchParams(window.location.search);
    const urlPlayerId = queryParams.get('playerId');
    let reqInterceptor: number | null = null;

    if (urlPlayerId) {
      reqInterceptor = api.interceptors.request.use((config) => {
        if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
          config.data = config.data || {};
          // Injeta o ID do jogador alvo em todas as requisições para contornar o erro 401
          config.data.npcId = parseInt(urlPlayerId);
          config.data.playerId = parseInt(urlPlayerId);
        } else if (config.method?.toLowerCase() === 'get') {
          config.params = config.params || {};
          config.params.npcId = parseInt(urlPlayerId);
          config.params.playerId = parseInt(urlPlayerId);
          config.params.playerID = parseInt(urlPlayerId);
        }
        return config;
      });
    }

    const unsub = on('playerDelete', (payload) => {
      if (payload.playerId === props.player.id) {
        api.delete('/player').then(() => Router.push('/'));
      }
    });

    return () => { 
      unsub?.(); 
      // Remove o interceptador ao sair da página para não vazar pra outras telas
      if (reqInterceptor !== null) {
        api.interceptors.request.eject(reqInterceptor);
      }
    };
  }, [on, props.player.id]);

  if (!ready)
		return (
			<Container className='text-center'>
				<Row className='align-items-center' style={{ height: '90vh' }}>
					<Col>
						<Spinner animation='border' style={{ color: '#8a2be2' }} />
					</Col>
				</Row>
			</Container>
		);

	const chars = props.diceConfig.characteristic.enable_modifiers
		? props.player.PlayerCharacteristic
		: props.player.PlayerCharacteristic.map((char) => ({
				...char,
				modifier: null,
		  }));

	const skills = props.diceConfig.skill.enable_modifiers
		? props.player.PlayerSkill
		: props.player.PlayerSkill.map((skill) => ({
				...skill,
				modifier: null,
		  }));

	return (
		<>
			<ErrorLogger.Provider value={addToast}>
        <Realtime.Provider value={null}>
					<Container>
						<Row className='display-5 text-center'>
							<Col>Ficha do Personagem</Col>
						</Row>
						<Row className='mb-3'>
							<PlayerInfoContainer
								title='Detalhes Pessoais'
								playerName={props.player.name}
								playerNameShow={props.player.showName}
								playerInfo={props.player.PlayerInfo}
							/>
							<Col xs={12} sm={6}>
								<PlayerAttributeContainer
									playerAttributes={props.player.PlayerAttributes}
									attributeDiceConfig={props.diceConfig.attribute}
									playerAttributeStatus={props.player.PlayerAttributeStatus}
									playerAvatars={props.player.PlayerAvatar}
								/>
							</Col>
						</Row>
						<hr />
						<Row className='justify-content-center'>
							{props.player.PlayerSpec.map((spec) => (
								<Col key={spec.Spec.id} xs={6} md={4} lg={3} className='text-center mb-2'>
									<PlayerSpecField
										value={spec.value}
										specId={spec.Spec.id}
										name={spec.Spec.name}
									/>
									<label htmlFor={`spec${spec.Spec.id}`}>{spec.Spec.name}</label>
								</Col>
							))}
						</Row>
						<hr />
						<Row className='mb-3'>
							<DataContainer outline title='Características'>
								<PlayerCharacteristicContainer
									playerCharacteristics={chars}
									characteristicDiceConfig={
										props.diceConfig.characteristic || props.diceConfig.base
									}
								/>
							</DataContainer>
						</Row>
						<Row className='mb-3'>
							<PlayerEquipmentContainer
								title='Combate'
								availableEquipments={props.availableEquipments}
								playerEquipments={props.player.PlayerEquipment}
								partners={props.partners}
							/>
						</Row>
						<Row className='mb-3'>
							<PlayerSkillContainer
								title='Perícias'
								playerSkills={skills}
								availableSkills={props.availableSkills}
								skillDiceConfig={props.diceConfig.skill || props.diceConfig.base}
								automaticMarking={props.automaticMarking}
							/>
						</Row>
						<Row className='mb-3'>
							<PlayerItemContainer
								title='Itens'
								playerItems={props.player.PlayerItem}
								availableItems={props.availableItems}
								playerMaxLoad={props.player.maxLoad}
								playerCurrency={props.player.PlayerCurrency}
								partners={props.partners}
							/>
						</Row>
						<Row className='mb-3'>
							<PlayerSpellContainer
								title='Rituais'
								playerSpells={props.player.PlayerSpell.map((sp) => sp.Spell)}
								availableSpells={props.availableSpells}
								playerMaxSlots={props.player.spellSlots}
							/>
						</Row>
					</Container>
        </Realtime.Provider>
			</ErrorLogger.Provider>
			<ErrorToastContainer toasts={toasts} />
		</>
	);
}

async function getSSP(ctx: GetServerSidePropsContext) {
	const playerSession = ctx.req.session.player;

	if (!playerSession) {
		return { redirect: { destination: '/', permanent: false } };
	}

	let targetId = playerSession.id;

	if (playerSession.admin && ctx.query.playerId) {
		const parsedId = parseInt(ctx.query.playerId as string);
		if (!isNaN(parsedId)) {
			targetId = parsedId;
		}
	}

	console.log('=== DEBUG DA FICHA ===');
	console.log('Sessão:', playerSession);
	console.log('URL da Query:', ctx.query);
	console.log('ID que vai pro banco:', targetId);

	const results = await prisma.$transaction([
		prisma.player.findUnique({
			where: { id: targetId },
			select: {
				id: true,
				name: true,
				showName: true,
				maxLoad: true,
				spellSlots: true,
				PlayerInfo: { select: { Info: true, value: true } },
				PlayerAvatar: { select: { AttributeStatus: true, link: true } },
				PlayerAttributes: {
					select: { Attribute: true, value: true, maxValue: true, show: true },
				},
				PlayerAttributeStatus: { select: { AttributeStatus: true, value: true } },
				PlayerSpec: { select: { Spec: true, value: true } },
				PlayerCharacteristic: {
					select: { Characteristic: true, value: true, modifier: true },
				},
				PlayerEquipment: { select: { Equipment: true, currentAmmo: true } },
				PlayerSkill: {
					select: {
						Skill: {
							select: {
								id: true,
								name: true,
								Specialization: { select: { name: true } },
							},
						},
						value: true,
						checked: true,
						modifier: true,
					},
				},
				PlayerCurrency: { select: { value: true, Currency: true } },
				PlayerItem: { select: { Item: true, currentDescription: true, quantity: true } },
				PlayerSpell: { select: { Spell: true } },
			},
		}),
		prisma.equipment.findMany({
			where: { visible: true, PlayerEquipment: { none: { player_id: targetId } } },
		}),
		prisma.skill.findMany({
			where: { PlayerSkill: { none: { player_id: targetId } } },
			select: {
				id: true,
				name: true,
				Specialization: {
					select: {
						name: true,
					},
				},
			},
		}),
		prisma.item.findMany({
			where: { visible: true, PlayerItem: { none: { player_id: targetId } } },
		}),
		prisma.spell.findMany({
			where: { visible: true, PlayerSpell: { none: { player_id: targetId } } },
		}),
		prisma.config.findUnique({ where: { name: 'dice' } }),
		prisma.config.findUnique({ where: { name: 'enable_automatic_markers' } }),
		prisma.player.findMany({
			where: {
				role: { in: ['PLAYER'] },
				id: { not: targetId },
			},
			select: {
				id: true,
				name: true,
			},
		}),
	]);

	if (!results[0]) {
		console.log('JOGADOR NÃO ENCONTRADO! Destruindo a sessão se não for mestre...');
		if (!playerSession.admin) {
			ctx.req.session.destroy();
		}
		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		};
	}

	return {
		props: {
			player: results[0],
			availableEquipments: results[1],
			availableSkills: results[2],
			availableItems: results[3],
			availableSpells: results[4],
			diceConfig: JSON.parse(results[5]?.value || 'null') as DiceConfig,
			automaticMarking: results[6]?.value === 'true' ? true : false,
			partners: results[7],
		},
	};
}

export const getServerSideProps = sessionSSR(getSSP);
