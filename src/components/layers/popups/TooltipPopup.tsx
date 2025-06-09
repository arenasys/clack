import { useChatState, useChatStateShallow } from "../../../state";
export default function TooltipPopup() {
  const tooltipPopup = useChatState((state) => state.tooltipPopup);
  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);

  if (tooltipPopup == undefined) {
    return <></>;
  }

  return (
    <div className="layer-container layer-popup">
      <div
        className={"tooltip tooltip-" + tooltipPopup.direction}
        style={{
          top: tooltipPopup.position.y,
          left: tooltipPopup.position.x,
        }}
      >
        <div className="tooltip-pointer" />
        <div className="tooltip-content">{tooltipPopup.content}</div>
      </div>
    </div>
  );
}
