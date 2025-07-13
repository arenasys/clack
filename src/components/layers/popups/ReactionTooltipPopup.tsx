import { EmojiSVG, EmojiLookupSymbol } from "../../../emoji";
import { useClackState, getClackState, ClackEvents } from "../../../state";
import { NaturalList } from "../../../util";
export default function ReactionTooltipPopup() {
  const reactionTooltipPopup = useClackState(
    ClackEvents.reactionTooltipPopup,
    (state) => state.gui.reactionTooltipPopup
  );

  if (reactionTooltipPopup == undefined) {
    return <></>;
  }

  const reaction = getClackState((state) =>
    state.chat.messages
      .get(reactionTooltipPopup.message)
      ?.reactions?.find((r) => r.emoji === reactionTooltipPopup.emoji)
  );

  var label = "";
  var othersLabel = "";

  if (reaction !== undefined) {
    const reactionEmoji = EmojiLookupSymbol(reaction.emoji);
    const reactionUsers = getClackState((state) =>
      reaction.users
        .map((u) => state.chat.users.get(u))
        .filter((u) => u !== undefined)
        .map((u) => u.nickname ?? u.username)
        .slice(0, 3)
    );

    label = `:${reactionEmoji.names[0]}: reacted by `;

    if (reaction.count > 3) {
      label += `${reactionUsers.join(", ")}, and `;
      othersLabel = `${reaction.count - 3} others`;
    } else {
      label += NaturalList(reactionUsers, "and");
    }
  }

  return (
    <div className="layer-container layer-popup">
      <div
        className="reaction-tooltip-anchor"
        style={{
          top: reactionTooltipPopup.position.y,
          left: reactionTooltipPopup.position.x,
        }}
      >
        <div className={"reaction-tooltip"}>
          <EmojiSVG
            symbol={reactionTooltipPopup.emoji}
            className="reaction-tooltip-emoji"
          />
          <div className="reaction-tooltip-content">
            <span>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
