import type { Spell } from '@prisma/client';
import { useContext, useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Image from 'react-bootstrap/Image';
import { ErrorLogger } from '../../contexts';
import useRealtime from '../../hooks/useRealtime';
import api from '../../utils/api';
import CustomSpinner from '../CustomSpinner';
import DataContainer from '../DataContainer';
import AddDataModal from '../Modals/AddDataModal';
import { resolveDices } from '../../utils/dice';
import type { DiceRollEvent } from '../../hooks/useDiceRoll';
import DiceRollModal from '../Modals/DiceRollModal';
import useDiceRoll from '../../hooks/useDiceRoll';
import SpellEditorModal, { RitualData } from '../Modals/SpellEditorModal';

type SpellType = Spell & {
	sanity?: string;
	resistance?: string;
	symbol?: string;
};

type PlayerSpellContainerProps = {
	title: string;
	playerSpells: SpellType[];
	availableSpells: SpellType[];
	playerMaxSlots: number;
	npcId?: number;
};

export default function PlayerSpellContainer(props: PlayerSpellContainerProps) {
	const [addSpellShow, setAddSpellShow] = useState(false);
	const [availableSpells, setAvailableSpells] = useState<{ id: number; name: string }[]>(
		props.availableSpells
	);
	const [playerSpells, setPlayerSpells] = useState<SpellType[]>(props.playerSpells);
	const [loading, setLoading] = useState(false);

	// Estados do Modal de Edição/Criação
	const [spellEditorModalShow, setSpellEditorModalShow] = useState(false);
	const [spellEditorData, setSpellEditorData] = useState<SpellType | undefined>(undefined);
	const [spellEditorOperation, setSpellEditorOperation] = useState<'create' | 'edit'>('create');

	const logError = useContext(ErrorLogger);
	const { on } = useRealtime();
	const [diceRoll, rollDice] = useDiceRoll(props.npcId);

	const socket_spellAdd = useRef<(id: number, name: string) => void>(() => {});
	const socket_spellRemove = useRef<(id: number) => void>(() => {});
	const socket_spellChange = useRef<(sp: SpellType) => void>(() => {});

	useEffect(() => {
		socket_spellAdd.current = (id, name) => {
			if (availableSpells.findIndex((sp) => sp.id === id) > -1) return;
			setAvailableSpells((spells) => [...spells, { id, name }]);
		};

		socket_spellRemove.current = (id) => {
			const index = playerSpells.findIndex((spell) => spell.id === id);
			if (index === -1) return;
			setPlayerSpells((spell) => {
				const newSpells = [...spell];
				newSpells.splice(index, 1);
				return newSpells;
			});
		};

		socket_spellChange.current = (sp) => {
			const availableIndex = availableSpells.findIndex((_sp) => _sp.id === sp.id);
			const playerIndex = playerSpells.findIndex((_sp) => _sp.id === sp.id);

			if (sp.visible) {
				if (availableIndex === -1 && playerIndex === -1)
					return setAvailableSpells((spells) => [...spells, sp]);
			} else if (availableIndex > -1) {
				return setAvailableSpells((spells) => {
					const newSpells = [...spells];
					newSpells.splice(availableIndex, 1);
					return newSpells;
				});
			}

			if (availableIndex > -1) {
				setAvailableSpells((spells) => {
					const newSpells = [...spells];
					newSpells[availableIndex] = sp;
					return newSpells;
				});
				return;
			}

			if (playerIndex === -1) return;

			setPlayerSpells((spells) => {
				const newSpells = [...spells];
				newSpells[playerIndex] = sp;
				return newSpells;
			});
		};
	});

	useEffect(() => {
		const unsubs: (() => void)[] = [];
		unsubs.push(on('spellAdd', (payload) => socket_spellAdd.current(payload.id, payload.name)));
		unsubs.push(on('spellRemove', (payload) => socket_spellRemove.current(payload.id)));
		unsubs.push(on('spellChange', (payload) => socket_spellChange.current(payload.spell)));
		return () => { unsubs.forEach(u => u()); };
	}, [on]);

	// Lógica de Criar Ritual Customizado
	function onSpellCreateSubmit(spell: RitualData) {
		setLoading(true);
		api
			.put('/sheet/spell', spell)
			.then((res) => {
				return api.put('/sheet/player/spell', { id: res.data.id, npcId: props.npcId });
			})
			.then((res) => {
				const newSpell = res.data.spell as SpellType;
				setPlayerSpells([...playerSpells, newSpell]);
				setSpellEditorModalShow(false);
			})
			.catch(logError)
			.finally(() => setLoading(false));
	}

	// Lógica de Editar Ritual (Duplo Clique)
	function onSpellEditSubmit(spell: RitualData) {
		setLoading(true);
		api
			.post('/sheet/spell', spell)
			.catch(logError)
			.finally(() => {
				setLoading(false);
				setSpellEditorModalShow(false);
			});
	}

	function onAddSpell(id: number) {
		setLoading(true);
		api
			.put('/sheet/player/spell', { id, npcId: props.npcId })
			.then((res) => {
				const spell = res.data.spell as SpellType;
				setPlayerSpells([...playerSpells, spell]);

				const newSpells = [...availableSpells];
				newSpells.splice(
					newSpells.findIndex((spell) => spell.id === id),
					1
				);
				setAvailableSpells(newSpells);
			})
			.catch(logError)
			.finally(() => {
				setAddSpellShow(false);
				setLoading(false);
			});
	}

	function onDeleteSpell(id: number) {
		const newPlayerSpells = [...playerSpells];
		const index = newPlayerSpells.findIndex((spell) => spell.id === id);

		newPlayerSpells.splice(index, 1);
		setPlayerSpells(newPlayerSpells);

		const modalSpell = { id, name: playerSpells[index].name };
		setAvailableSpells([...availableSpells, modalSpell]);
	}

	return (
		<>
			<DataContainer
				outline
				title={props.title}
				addButton={{ onAdd: () => setAddSpellShow(true), disabled: loading }}>
				
				<Row className='mb-3 justify-content-center'>
					<Col xs='auto'>
						<Button 
							size='sm' 
							variant='secondary' 
							style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}
							onClick={() => {
								setSpellEditorData(undefined);
								setSpellEditorOperation('create');
								setSpellEditorModalShow(true);
							}}
						>
							+ Criar Ritual Customizado
						</Button>
					</Col>
				</Row>

				<Row>
					{playerSpells.map((spell) => (
						<PlayerSpellField
							key={spell.id}
							spell={spell}
							onDelete={onDeleteSpell}
							showDiceRollResult={rollDice}
							npcId={props.npcId}
							onEditBase={() => {
								setSpellEditorData(spell);
								setSpellEditorOperation('edit');
								setSpellEditorModalShow(true);
							}}
						/>
					))}
				</Row>
			</DataContainer>
			<AddDataModal
				title='Adicionar'
				show={addSpellShow}
				onHide={() => setAddSpellShow(false)}
				data={availableSpells}
				onAddData={onAddSpell}
				disabled={loading}
			/>
			<SpellEditorModal
				show={spellEditorModalShow}
				onHide={() => setSpellEditorModalShow(false)}
				data={spellEditorData as RitualData}
				operation={spellEditorOperation}
				onSubmit={(spell) => {
					if (spellEditorOperation === 'create') onSpellCreateSubmit(spell);
					else onSpellEditSubmit(spell);
				}}
				disabled={loading}
			/>
			<DiceRollModal {...diceRoll} />
		</>
	);
}

type PlayerSpellFieldProps = {
	spell: SpellType;
	onDelete: (id: number) => void;
	showDiceRollResult: DiceRollEvent;
	onEditBase: () => void;
	npcId?: number;
};

function PlayerSpellField({
	spell,
	onDelete,
	showDiceRollResult,
	onEditBase,
	npcId
}: PlayerSpellFieldProps) {
	const logError = useContext(ErrorLogger);
	const [loading, setLoading] = useState(false);

	function deleteSpell() {
		if (!confirm('Tem certeza que deseja apagar esse ritual?')) return;
		setLoading(true);
		api
			.delete('/sheet/player/spell', { data: { id: spell.id, npcId } })
			.then(() => {
				onDelete(spell.id);
			})
			.catch(logError)
			.finally(() => setLoading(false));
	}

	function diceRoll() {
		const aux = resolveDices(spell.damage);
		if (aux) showDiceRollResult({ dices: aux });
	}

	return (
		<Col xs={12} className='mb-3 w-100 text-center'>
			<Row>
				<Col className='data-container mx-3'>
					{/* Símbolo do Ritual se existir e não for '-' */}
					{spell.symbol && spell.symbol !== '-' && (
						<Row className='mt-3 justify-content-center'>
							<Col xs='auto'>
								<Image
									src={spell.symbol}
									alt={spell.name}
									style={{ maxHeight: '8rem', objectFit: 'contain' }}
								/>
							</Col>
						</Row>
					)}
					<Row className='mt-2'>
						<Col 
							className='h2'
							onDoubleClick={onEditBase} 
							title="Dê um duplo clique para editar este ritual."
							style={{ cursor: 'pointer', color: '#b175ff', textDecoration: 'underline' }}
						>
							{spell.name}
							<Button
								aria-label='Apagar'
								className='ms-3'
								variant='secondary'
								size='sm'
								style={{ verticalAlign: 'middle', textDecoration: 'none' }}
								onClick={(e) => {
									e.stopPropagation();
									deleteSpell();
								}}
								disabled={loading}>
								{loading ? <CustomSpinner /> : 'Apagar'}
							</Button>
						</Col>
					</Row>
					<Row>
						<Col className='h5 spell-description' style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
							{spell.description}
						</Col>
					</Row>
					<Row className='mb-2'>
						<Col>Custo: {spell.cost}</Col>
					</Row>
					{/* Sanidade (se preenchido e não for '-') */}
					{spell.sanity && spell.sanity !== '-' && (
						<Row className='mb-2'>
							<Col>Sanidade: {spell.sanity}</Col>
						</Row>
					)}
					<Row className='mb-2'>
						<Col>Elemento: {spell.type}</Col>
					</Row>
					<Row className='mb-2'>
						<Col>
							<span className='me-1'>Dano: {spell.damage} </span>
							{spell.damage !== '-' && (
								<Image
									alt='Dado'
									src='/dice20.png'
									className='clickable'
									onClick={diceRoll}
									style={{ maxHeight: '2rem' }}
								/>
							)}
						</Col>
					</Row>
					{/* Resistência (se preenchido e não for '-') */}
					{spell.resistance && spell.resistance !== '-' && (
						<Row className='mb-2'>
							<Col>Resistência: {spell.resistance}</Col>
						</Row>
					)}
					<Row className='mb-2'>
						<Col>Alvo: {spell.target}</Col>
					</Row>
					<Row className='mb-2'>
						<Col>Tempo de Conjuração: {spell.castingTime}</Col>
					</Row>
					<Row className='mb-2'>
						<Col>Alcance: {spell.range}</Col>
					</Row>
					<Row className='mb-2'>
						<Col>Duração: {spell.duration}</Col>
					</Row>
				</Col>
			</Row>
		</Col>
	);
}
