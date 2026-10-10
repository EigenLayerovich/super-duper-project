import {
  useEffect,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import type { FeatureRegistry } from "@idosgames/module-sdk";
import {
  Button,
  EmptyState,
  Icon,
  Popup,
  ResourceList,
  errorText,
  outlined,
  screenBackground,
  useCatalog,
  useCelebrate,
  useNotify,
  v,
} from "@idosgames/react/ui";
import type { IdleSession } from "../game/session";
import { formatBig, formatDuration } from "../game/format";
import { BATTLE_HEIGHT_CSS } from "../layout";
import { t } from "../i18n";
import { BattleHud } from "./BattleHud";
import { BottomNav } from "./BottomNav";
import { EnhancePanel } from "./EnhancePanel";
import { GuideQuest } from "./GuideQuest";
import { SkillBar } from "./SkillBar";

// The game's whole interface over the canvas: the HUD on top of the fight, and under it the panel —
// the quest strip, the skills, Enhance, and the bottom bar to the systems. The lobby, balances and
// wallet are the base's; this is the game's own screen, Legend Slime-style. Next to the base the game
// sits inside the lobby, whose tabs open the systems — then the game's own bar is not drawn (`nav`).

export function makeGamePanel(
  session: IdleSession,
  features: FeatureRegistry,
  nav = true,
): ComponentType {
  return function IdleRpgPanel(): ReactNode {
    useSyncExternalStore(session.subscribe, session.getVersion);
    useNotices(session);
    const hero = session.hero;

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          fontFamily: v.font,
          color: v.text,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: BATTLE_HEIGHT_CSS,
          }}
        >
          <BattleHud session={session} />
        </div>
        <div
          style={{
            position: "absolute",
            top: BATTLE_HEIGHT_CSS,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            background: screenBackground,
            pointerEvents: "auto",
          }}
        >
          <div
            className="idos-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "8px 10px 12px",
            }}
          >
            <div
              style={{
                maxWidth: 620,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 8,
              }}
            >
              <GuideQuest features={features} />
              <SkillBar session={session} />
              {hero ? (
                <EnhancePanel session={session} hero={hero} />
              ) : session.loaded ? (
                <EmptyState glyph="hero" text={t("noHero")} />
              ) : (
                <div
                  style={{ ...outlined, color: v.textDim, textAlign: "center" }}
                >
                  {t("loading")}
                </div>
              )}
            </div>
          </div>
          {nav ? <BottomNav features={features} /> : null}
        </div>
        {session.away ? <AwayPopup session={session} /> : null}
      </div>
    );
  };
}

/** "While you were away": what the hero earned off screen — already credited by the server. */
function AwayPopup({ session }: { session: IdleSession }): ReactNode {
  const away = session.away!;
  const celebrate = useCelebrate();
  const catalog = useCatalog();
  const lines = [
    { kind: "currency" as const, id: away.currencyID, amount: away.amount },
  ];
  const close = () => {
    celebrate(lines);
    session.dismissAway();
  };
  return (
    <Popup
      title={t("welcomeBack")}
      onClose={close}
      width={380}
      variant="center"
    >
      <div
        style={{
          display: "grid",
          gap: 12,
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <div className="idos-bounce">
          <Icon glyph={catalog.iconOf(lines[0]!)} size={64} />
        </div>
        <div style={{ ...outlined, fontSize: 14, color: v.textDim }}>
          {t("awayText")} · {formatDuration(away.seconds)}
        </div>
        <div style={{ ...outlined, fontSize: 28, color: v.gold }}>
          +{formatBig(away.amount)}
        </div>
        <ResourceList lines={lines} size={20} />
        <Button tone="gold" size="lg" attract onClick={close}>
          {t("collect")}
        </Button>
      </div>
    </Popup>
  );
}

/** The session's refusals as toasts ("not enough gold", a server error). */
function useNotices(session: IdleSession): void {
  const notify = useNotify();
  const catalog = useCatalog();
  const notice = session.notice;
  useEffect(() => {
    if (!notice) return;
    if (notice.kind === "notEnough")
      notify.toast({
        level: "warning",
        key: "idle-not-enough",
        title: `${t("notEnough")}: ${catalog.currencyName(notice.currencyID)}`,
      });
    else notify.toast({ level: "error", message: errorText(notice.text) });
    // Keyed on the notice's time: each refusal shows once.
  }, [notice?.at]);
}
