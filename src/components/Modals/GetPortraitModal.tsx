import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormCheck from 'react-bootstrap/FormCheck';
import FormControl from 'react-bootstrap/FormControl';
import FormLabel from 'react-bootstrap/FormLabel';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import api from '../../utils/api';

export type PortraitEnvironmentOrientation = 'Direita' | 'Esquerda';

type GetPortraitModalProps = {
	show: boolean;
	onHide: () => void;
	playerId: number;
};

export default function GetPortraitModal(props: GetPortraitModalProps) {
	const [orientation, setOrientation] = useState<PortraitEnvironmentOrientation>('Direita');
	const [showDiceRoll, setShowDiceRoll] = useState(true);
	const [diceColor, setDiceColor] = useState('ddaf0f');
	const [copied, setCopied] = useState(false);

	// Carrega a cor salva do localStorage/Banco sempre que o modal abre
	useEffect(() => {
		if (props.show && props.playerId) {
			const savedColor = localStorage.getItem(`portrait_dicecolor_${props.playerId}`);
			if (savedColor) {
				setDiceColor(savedColor);
			}
		}
	}, [props.show, props.playerId]);

	function handleColorChange(colorWithHash: string) {
		const cleanColor = colorWithHash.replace('#', '');
		setDiceColor(cleanColor);
		localStorage.setItem(`portrait_dicecolor_${props.playerId}`, cleanColor);

		// Salva no Banco de Dados para persistir no Portrait mesmo após dar F5
		api.post('/config', { name: `diceColor_${props.playerId}`, value: cleanColor }).catch(console.error);
	}

	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const portraitUrl = `${origin}/portrait/${props.playerId}?orientation=${orientation}&showdiceroll=${showDiceRoll}&dicecolor=${diceColor}`;

	function copyUrl() {
		navigator.clipboard.writeText(portraitUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Modal show={props.show} onHide={props.onHide} centered className='theme-element'>
			<Modal.Header closeButton>
				<Modal.Title>Link do Retrato do Personagem</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Row className='mb-3 align-items-center'>
					<Col xs={12} md={6} className='mb-2 mb-md-0'>
						<FormLabel htmlFor='orientationSelect' className='fw-bold'>
							Orientação do Nome:
						</FormLabel>
						<FormControl
							as='select'
							id='orientationSelect'
							className='theme-element'
							value={orientation}
							onChange={(e) => setOrientation(e.target.value as PortraitEnvironmentOrientation)}>
							<option value='Direita'>Direita</option>
							<option value='Esquerda'>Esquerda</option>
						</FormControl>
					</Col>
					<Col xs={12} md={6}>
						<FormLabel htmlFor='diceColorInput' className='fw-bold'>
							Cor do Dado:
						</FormLabel>
						<div className='d-flex align-items-center'>
							<FormControl
								type='color'
								id='diceColorInput'
								value={`#${diceColor}`}
								onChange={(e) => handleColorChange(e.target.value)}
								style={{ maxWidth: '60px', height: '38px', padding: '2px' }}
							/>
							<span className='ms-2 text-muted'>#{diceColor.toUpperCase()}</span>
						</div>
					</Col>
				</Row>
				<Row className='mb-3'>
					<Col>
						<FormCheck
							type='checkbox'
							id='showDiceRollCheck'
							label='Mostrar Rolagem de Dados'
							checked={showDiceRoll}
							onChange={(e) => setShowDiceRoll(e.target.checked)}
						/>
					</Col>
				</Row>
				<Row>
					<Col>
						<FormControl
							type='text'
							readOnly
							value={portraitUrl}
							className='theme-element mb-2'
						/>
					</Col>
				</Row>
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={props.onHide}>
					Fechar
				</Button>
				<Button variant='primary' onClick={copyUrl}>
					{copied ? 'Copiado!' : 'Copiar Link'}
				</Button>
			</Modal.Footer>
		</Modal>
	);
}
