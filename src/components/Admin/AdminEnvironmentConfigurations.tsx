import type { ChangeEvent } from 'react';
import { useContext, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormCheck from 'react-bootstrap/FormCheck';
import Row from 'react-bootstrap/Row';
import FormLabel from 'react-bootstrap/FormLabel';
import FormControl from 'react-bootstrap/FormControl';
import { ErrorLogger } from '../../contexts';
import api from '../../utils/api';
import type { Environment } from '../../utils/config';

export default function AdminEnvironmentConfigurations(props: {
	environment: Environment;
	environmentColor?: string;
}) {
	const [environment, setEnvironment] = useState(props.environment);
	const [environmentColor, setEnvironmentColor] = useState(props.environmentColor || '#00ff00');
	const logError = useContext(ErrorLogger);

	function environmentChange(ev: ChangeEvent<HTMLInputElement>) {
		const value = ev.target.checked ? 'combat' : 'idle';
		setEnvironment(value);
		api.post('/config', { name: 'environment', value }).catch((err) => {
			setEnvironment(environment);
			logError(err);
		});
	}

	function onColorChange(ev: ChangeEvent<HTMLInputElement>) {
		const newColor = ev.target.value;
		setEnvironmentColor(newColor);
		// Salva a nova cor no banco
		api.post('/config', { name: 'environmentColor', value: newColor }).catch(logError);
	}

	return (
		<Row className='align-items-center justify-content-center mt-3 mb-3'>
			<Col xs='auto' className='text-center h5 mb-0'>
				<FormCheck
					inline
					checked={environment === 'combat'}
					onChange={environmentChange}
					id='changeEnvironment'
					label='Retrato em Ambiente de Combate? (Extensão OBS)'
				/>
			</Col>
			<Col xs='auto' className='d-flex align-items-center ms-md-4 mt-3 mt-md-0'>
				<FormLabel htmlFor='envColor' className='mb-0 me-2 fw-bold'>
					Fundo do Portrait:
				</FormLabel>
				<FormControl
					type='color'
					id='envColor'
					value={environmentColor !== 'transparent' ? environmentColor : '#000000'}
					onChange={onColorChange}
					title='Escolha a cor do fundo (Ex: para Chroma Key)'
					style={{ maxWidth: '60px' }}
				/>
				<Button 
					variant="outline-secondary" 
					size="sm" 
					className="ms-2" 
					onClick={() => {
						setEnvironmentColor('transparent');
						api.post('/config', { name: 'environmentColor', value: 'transparent' }).catch(logError);
					}}
				>
					Ficar Transparente
				</Button>
			</Col>
		</Row>
	);
}
