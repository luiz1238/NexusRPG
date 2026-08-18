import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import type { PortraitEnvironmentOrientation } from '../../components/Modals/GetPortraitModal';
import type { PortraitAttributeStatus } from '../../components/Portrait/PortraitAvatarContainer';
import PortraitAvatarContainer from '../../components/Portrait/PortraitAvatarContainer';
import PortraitDiceContainer from '../../components/Portrait/PortraitDiceContainer';
import PortraitEnvironmentalContainer from '../../components/Portrait/PortraitEnvironmentalContainer';
import PortraitSideAttributeContainer from '../../components/Portrait/PortraitSideAttributeContainer';
import PortraitDraggableResizable, { type LayoutData, PortraitResetProvider, usePortraitReset } from '../../components/Portrait/PortraitDraggableResizable';
import useRealtime from '../../hooks/useRealtime';
import styles from '../../styles/modules/Portrait.module.scss';
import type { Environment, PortraitFontConfig } from '../../utils/config';
import prisma from '../../utils/database';

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Page(props: PageProps) {
  const { ready } = useRealtime();

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';

    if (props.customFont) {
      const font = new FontFace('OpenRPG Custom Font', `url(${props.customFont.data})`);
      font.load().then(() => {
        document.fonts.add(font);
        document.body.classList.add('custom-font');
      });
    }
  }, []);

  if (props.notFound) return <h1>Personagem não existe.</h1>;

  if (!ready)
    return (
      <Container className='text-center'>
        <Row className='align-items-center' style={{ height: '90vh' }}>
          <Col>
            <Spinner animation='border' variant='secondary' />
          </Col>
        </Row>
      </Container>
    );

  return <CharacterPortrait {...props} />;
}

function CharacterPortrait(props: PageProps) {
  const [debug, setDebug] = useState(false);
  const [showDice, setShowDice] = useState(false);

  return (
    <PortraitResetProvider>
      <PortraitInner
        {...props}
        debug={debug}
        setDebug={setDebug}
        showDice={showDice}
        setShowDice={setShowDice}
      />
    </PortraitResetProvider>
  );
}

function PortraitInner(props: PageProps & { debug: boolean; setDebug: (v: boolean) => void; showDice: boolean; setShowDice: (v: boolean) => void }) {
  const resetAll = usePortraitReset();

  return (
    <div className={styles.portrait}>
      <PortraitAvatarContainer
        playerId={props.playerId}
        attributeStatus={props.attributeStatus}
        debug={props.debug}
        layout={props.layouts.avatar}
      />
      <PortraitSideAttributeContainer
        sideAttribute={props.sideAttribute}
        debug={props.debug}
        playerId={props.playerId}
        layout={props.layouts['side-attribute']}
      />
      <PortraitEnvironmentalContainer
        attributes={props.attributes}
        environment={props.environment}
        playerId={props.playerId}
        playerName={props.playerName}
        debug={props.debug}
        nameOrientation={props.nameOrientation}
        attributesLayout={props.layouts.attributes}
        nameLayout={props.layouts.name}
      />
      <PortraitDiceContainer
        playerId={props.playerId}
        color={props.diceColor}
        showDiceRoll={props.showDiceRoll}
        showDice={props.showDice}
        onShowDice={() => props.setShowDice(true)}
        onHideDice={() => props.setShowDice(false)}
        debug={props.debug}
        layout={props.layouts.dice}
      />
      <div className={styles.editor}>
        <Button
          variant='secondary'
          title='Desativa o controle do ambiente pelo mestre.'
          onClick={() => props.setDebug((e: boolean) => !e)}>
          {props.debug ? 'Desativar' : 'Ativar'} Editor
        </Button>
        {props.debug && (
          <Button
            variant='danger'
            className='ms-2'
            onClick={resetAll}
          >
            Resetar Tudo
          </Button>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const nameOrientation =
    (ctx.query.orientation as PortraitEnvironmentOrientation) || 'Direita';
  const playerId = parseInt(ctx.query.characterID as string);
  const diceColor = (ctx.query.dicecolor as string) || 'ddaf0f';
  const showDiceRoll = (ctx.query.showdiceroll as string) === 'true';

  const results = await prisma.$transaction([
    prisma.config.findUnique({ where: { name: 'environment' } }),
    prisma.player.findUnique({
      where: { id: playerId },
      select: {
        name: true,
        showName: true,
        PlayerAttributes: {
          where: { Attribute: { portrait: { in: ['PRIMARY', 'SECONDARY'] } } },
          select: {
            value: true,
            maxValue: true,
            show: true,
            Attribute: { select: { id: true, name: true, color: true, portrait: true } },
          },
        },
        PlayerAttributeStatus: {
          select: { value: true, attribute_status_id: true },
        },
        PortraitLayouts: {
          select: { element: true, posX: true, posY: true, scale: true, rotation: true, fontSize: true },
        },
      },
    }),
    prisma.config.findUnique({ where: { name: 'portrait_font' } }),
  ]);

  if (!results[1])
    return {
      props: {
        playerId: playerId,
        environment: 'idle' as Environment,
        attributes: [],
        attributeStatus: [],
        sideAttribute: null,
        playerName: { name: 'Desconhecido', show: false },
        notFound: true,
        diceColor,
        nameOrientation,
        showDiceRoll,
        layouts: {},
      },
    };

  const layouts: Record<string, LayoutData> = {};
  for (const l of results[1].PortraitLayouts) {
    layouts[l.element] = {
      posX: l.posX,
      posY: l.posY,
      scale: l.scale,
      rotation: l.rotation,
      fontSize: l.fontSize,
    };
  }

  const attributes = results[1].PlayerAttributes.filter(
    (attr) => attr.Attribute.portrait === 'PRIMARY'
  );

  const sideAttribute =
    results[1].PlayerAttributes.find((attr) => attr.Attribute.portrait === 'SECONDARY') || null;

  return {
    props: {
      playerId: playerId,
      environment: (results[0]?.value || 'idle') as Environment,
      attributes,
      sideAttribute,
      attributeStatus: results[1].PlayerAttributeStatus,
      playerName: { name: results[1].name, show: results[1].showName },
      customFont: JSON.parse(results[2]?.value || 'null') as PortraitFontConfig,
      diceColor,
      nameOrientation,
      showDiceRoll,
      layouts,
    },
  };
}
