// @refresh reset
import { useEffect, useState, useRef, useMemo, memo } from "react";

import { VList, VListHandle } from "virtua";

import { useClackState, getClackState, ClackEvents } from "../../../state.tsx";
import {
  EventBus,
  useEventBus,
  useEventBusDynamic,
} from "../../../state/events.tsx";

import { BiSearch } from "react-icons/bi";

import { ClickWrapper, IconButton } from "../../Common";

import { isInsideRect } from "../../../util";

import {
  RiEmotionFill,
  RiSailboatFill,
  RiCupFill,
  RiPokerHeartsFill,
  RiFlagFill,
  RiFlaskFill,
  RiSeedlingFill,
} from "react-icons/ri";
import { MdSportsFootball } from "react-icons/md";

import {
  emojiMap,
  EmojiPNG,
  EmojiEntry,
  EmojiSearchByPartialName,
  EmojiToCodePoint,
  EmojiLookupName,
  EmojiCountryByFlag,
} from "../../../emoji.tsx";

function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  switch (category) {
    case "people":
      return <RiEmotionFill className={className} />;
    case "nature":
      return <RiSeedlingFill className={className} />;
    case "food":
      return <RiCupFill className={className} />;
    case "activity":
      return <MdSportsFootball className={className} />;
    case "travel":
      return <RiSailboatFill className={className} />;
    case "objects":
      return <RiFlaskFill className={className} />;
    case "symbols":
      return <RiPokerHeartsFill className={className} />;
    case "flags":
      return <RiFlagFill className={className} />;
    default:
      return null;
  }
}

function getEmoji(emoji: EmojiEntry, selectedTone: number): EmojiEntry {
  var shown = emoji;
  if (selectedTone != 0 && emoji.diversityChildren) {
    var index = selectedTone - 1;
    if (emoji.hasMultiDiversity) {
      index += index * 5;
    }

    shown = emoji.diversityChildren[index];
  }
  return shown;
}

const eventBus = new EventBus();

interface MultiToneTarget {
  rect: DOMRect;
  emoji: EmojiEntry;
}
var state: {
  selectedTone: number;
  selectedEmoji?: EmojiEntry;
  multiToneTarget?: MultiToneTarget;
} = {
  selectedTone: 0,
  selectedEmoji: undefined,
  multiToneTarget: undefined,
};

(globalThis as any).state = state;
(globalThis as any).eventBus = eventBus;

function getEmojiSelection(emoji: EmojiEntry): string {
  if (state.multiToneTarget?.emoji.symbol === emoji.symbol) {
    return "disabled";
  }
  if (
    state.selectedEmoji?.symbol === emoji.symbol ||
    emoji?.diversityChildren?.some(
      (child) => child.symbol === state.selectedEmoji?.symbol
    )
  ) {
    return "selected";
  }
  return "";
}

function EmojiPickerEntry({
  emoji,
  onSelect,
  onClick,
  onMultiTone,
}: {
  emoji: EmojiEntry;
  onSelect: (emoji: EmojiEntry) => void;
  onClick: (emoji: EmojiEntry) => void;
  onMultiTone: (target: MultiToneTarget | undefined) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEventBusDynamic(eventBus, (keys) => {
    keys.push(emoji.symbol);
    if (emoji.diversityChildren) {
      for (const child of emoji.diversityChildren) {
        keys.push(child.symbol);
      }
      keys.push("tone");
    }
  });

  const selectedClass = getEmojiSelection(emoji);

  const shown = getEmoji(emoji, state.selectedTone);

  return (
    <li ref={ref}>
      <button
        className={`emoji-picker-entry ${selectedClass}`}
        onMouseMove={() => onSelect(shown)}
        onClick={() => {
          onClick(shown);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          var target: MultiToneTarget | undefined = {
            emoji: emoji,
            rect: ref.current!.getBoundingClientRect(),
          };
          const hasMultiDiversity =
            emoji.hasMultiDiversity && state.selectedTone != 0;
          if (!hasMultiDiversity || state.multiToneTarget !== undefined) {
            target = undefined;
          }

          onMultiTone(target);
        }}
      >
        <EmojiPNG symbol={shown.symbol} />
      </button>
    </li>
  );
}

function EmojiPickerRowInternal({
  rowIndex,
  rowItems,
  onClick,
  onSelect,
  onMultiTone,
}: {
  rowIndex: number;
  rowItems: EmojiEntry[];
  onClick: (e: EmojiEntry) => void;
  onSelect: (e: EmojiEntry) => void;
  onMultiTone: (target: MultiToneTarget | undefined) => void;
}) {
  return (
    <ul className={`emoji-picker-row ${rowIndex === 0 ? "first" : ""}`}>
      {rowItems.map((emoji, _) => (
        <EmojiPickerEntry
          key={emoji.symbol}
          emoji={emoji}
          onClick={onClick}
          onSelect={onSelect}
          onMultiTone={onMultiTone}
        />
      ))}
    </ul>
  );
}

const EmojiPickerRow = memo(EmojiPickerRowInternal, (prevProps, nextProps) => {
  return (
    prevProps.rowIndex === nextProps.rowIndex &&
    prevProps.rowItems.length === nextProps.rowItems.length &&
    prevProps.rowItems.every(
      (item, index) => item.symbol === nextProps.rowItems[index].symbol
    )
  );
});

function EmojiPickerBody({
  data,
  listRef,
  onScroll,
  onClick,
  onSelect,
  onMultiTone,
}: {
  data: React.MutableRefObject<(string | EmojiEntry[])[]>;
  listRef: React.Ref<VListHandle>;
  onScroll: () => void;
  onClick: (emoji: EmojiEntry) => void;
  onSelect: (emoji: EmojiEntry) => void;
  onMultiTone: (target: MultiToneTarget | undefined) => void;
}) {
  return (
    <VList
      ref={listRef}
      className="thin-scrollbar emoji-picker-body"
      count={data.current.length}
      onScroll={onScroll}
    >
      {(index) => {
        const row = data.current[index];
        if (typeof row === "string") {
          return (
            <div className="emoji-picker-category">
              <CategoryIcon category={row} />
              <span className="text-heading-small">
                {row.charAt(0).toUpperCase() + row.slice(1)}
              </span>
            </div>
          );
        } else {
          return (
            <EmojiPickerRow
              rowIndex={index}
              rowItems={row}
              onClick={onClick}
              onSelect={onSelect}
              onMultiTone={onMultiTone}
            />
          );
        }
      }}
    </VList>
  );
}

export default function EmojiPickerPopup() {
  const listRef = useRef<VListHandle>(null);
  const listData = useRef<(string | EmojiEntry[])[]>([]);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);

  const [selectedEmoji, setSelectedEmoji] = useState<EmojiEntry | undefined>(
    undefined
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const toneListRef = useRef<HTMLDivElement>(null);

  const clapSymbol = EmojiLookupName("clap")!;
  const toneSymbols = [
    clapSymbol.symbol,
    ...clapSymbol.diversityChildren!.map((e) => e.symbol),
  ];
  const [showingToneList, setShowingToneList] = useState<boolean>(false);
  const [selectedTone, setSelectedTone] = useState<number>(0);

  const multiToneListRef = useRef<HTMLDivElement>(null);
  const [multiToneTarget, setMultiToneTarget] = useState<
    MultiToneTarget | undefined
  >(undefined);
  const showingMultiToneList = multiToneTarget !== undefined;
  const wasListJustClosed = useRef<boolean>(undefined);

  const selectedEmojiCountry = EmojiCountryByFlag(
    selectedEmoji?.names[0] ?? ""
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState<string>("");

  const emojiPickerPopup = useClackState(
    ClackEvents.emojiPickerPopup,
    (state) => state.gui.emojiPickerPopup
  );
  const setEmojiPickerPopup = getClackState(
    (state) => state.gui.setEmojiPickerPopup
  );

  function pickEmoji(emoji: EmojiEntry) {
    var entry = EmojiLookupName(emoji.symbol);
    if (entry === undefined) return;

    emojiPickerPopup?.onPick(entry.id, entry.symbol);
    setEmojiPickerPopup(undefined);
  }

  state = {
    selectedTone: selectedTone,
    selectedEmoji: selectedEmoji,
    multiToneTarget: multiToneTarget,
  };

  function doSetSelectedTone(tone: number) {
    state.selectedTone = tone;
    setSelectedTone(tone);
    eventBus.emit("tone");
  }

  function doSetSelectedEmoji(emoji: EmojiEntry | undefined) {
    if (state.selectedEmoji === emoji) return;
    const oldSelectedEmoji = state.selectedEmoji;
    state.selectedEmoji = emoji;
    if (oldSelectedEmoji !== undefined) {
      eventBus.emit(oldSelectedEmoji.symbol);
    }
    setSelectedEmoji(emoji);
    if (emoji !== undefined) {
      eventBus.emit(emoji.symbol);
    }
  }

  function doSetMultiToneTarget(
    target:
      | {
          rect: DOMRect;
          emoji: EmojiEntry;
        }
      | undefined
  ) {
    const oldMultiToneTarget = state.multiToneTarget;
    state.multiToneTarget = target;
    if (oldMultiToneTarget !== undefined) {
      eventBus.emit(oldMultiToneTarget.emoji.symbol);
    }
    setMultiToneTarget(target);
    if (target !== undefined) {
      eventBus.emit(target.emoji.symbol);
    }
  }

  function clear() {
    eventBus.clear();
    setSearch("");
    setSelectedCategory("people");
    setShowingToneList(false);
    doSetSelectedEmoji(undefined);
    doSetSelectedTone(0);
    doSetMultiToneTarget(undefined);
  }

  function syncCurrentCategory() {
    var category = "";
    const currentIndex = (listRef.current?.findStartIndex() || 0) + 4;
    for (let i = 0; i <= currentIndex; i++) {
      const item = listData.current[i];
      if (typeof item === "string") {
        category = item as string;
      }
    }
    setSelectedCategory(category);
  }

  function getEmojiIndex(emoji: EmojiEntry): [number, number] {
    for (let i = 0; i < listData.current.length; i++) {
      const item = listData.current[i];
      if (typeof item === "string") continue;
      const row = item as EmojiEntry[];
      for (let j = 0; j < row.length; j++) {
        if (row[j].symbol === emoji.symbol) {
          return [i, j];
        }
        const children = row[j].diversityChildren;
        if (children) {
          for (let k = 0; k < children.length || 0; k++) {
            if (children[k].symbol === emoji.symbol) {
              return [i, j];
            }
          }
        }
      }
    }
    return [-1, -1];
  }

  function tryMoveSelection(vDelta: number, hDelta: number) {
    if (showingToneList) {
    }

    if (showingMultiToneList) {
      var [vIndex, hIndex] = getEmojiIndex(multiToneTarget.emoji);
      const emoji = listData.current[vIndex][hIndex] as EmojiEntry;
      const tones = emoji.diversityChildren!.slice(
        (selectedTone - 1) * 5,
        selectedTone * 5
      );
      var index = tones.findIndex((e) => e.symbol === selectedEmoji?.symbol);
      index = Math.max(0, Math.min(4, index + hDelta));
      doSetSelectedEmoji(tones[index]);
      return;
    }

    if (selectedEmoji === undefined) return;

    var [vIndex, hIndex] = getEmojiIndex(selectedEmoji);

    if (vIndex === -1 || hIndex === -1) {
      return;
    }

    function getRow(index: number): EmojiEntry[] {
      return listData.current[index] as EmojiEntry[];
    }

    function incV(delta: number, skip: boolean = true) {
      vIndex += delta;
      if (typeof listData.current[vIndex] === "string") {
        vIndex += delta;
      }
      if (skip && hIndex >= getRow(vIndex)?.length) {
        vIndex += delta;
      }
      if (typeof listData.current[vIndex] === "string") {
        vIndex += delta;
      }
    }

    function incH(delta: number) {
      hIndex += delta;
      const row = getRow(vIndex);
      if (row.length <= hIndex) {
        incV(1, false);
        hIndex = 0;
      }
      if (hIndex < 0) {
        incV(-1, false);
        hIndex = getRow(vIndex).length - 1;
      }
    }

    if (vDelta != 0) incV(vDelta);
    if (hDelta != 0) incH(hDelta);

    const row = getRow(vIndex);
    if (row[hIndex] !== undefined) {
      doSetSelectedEmoji(getEmoji(row[hIndex], selectedTone));
      if (listRef.current) {
        const first =
          vIndex === 0 ||
          (vIndex === 1 && typeof listData.current[0] === "string");
        listRef.current.scrollToIndex(vIndex, {
          align: first ? "center" : "nearest",
        });
      }
      return true;
    }

    return false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === "ArrowDown") {
      doSetSelectedTone((selectedTone + 1) % toneSymbols.length);
    }

    if (e.key === "ArrowLeft") {
      if (tryMoveSelection(0, -1)) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowRight") {
      if (tryMoveSelection(0, 1)) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowUp") {
      if (tryMoveSelection(-1, 0)) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown") {
      if (tryMoveSelection(1, 0)) {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      if (showingToneList) {
        setShowingToneList(false);
      } else if (showingMultiToneList) {
        doSetMultiToneTarget(undefined);
      } else {
        setEmojiPickerPopup(undefined);
      }
    }
  }

  useEffect(() => {
    window.removeEventListener("keydown", onKeyDown);

    if (emojiPickerPopup !== undefined) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiPickerPopup, selectedEmoji]);

  function onMouseDown(e: MouseEvent) {
    if (showingToneList && toneListRef.current) {
      var rect = toneListRef.current.getBoundingClientRect();
      if (!isInsideRect(e.clientX, e.clientY, rect)) {
        wasListJustClosed.current = true;
        setShowingToneList(false);
      }
    }
    if (showingMultiToneList && multiToneListRef.current) {
      var rect = multiToneListRef.current.getBoundingClientRect();
      if (!isInsideRect(e.clientX, e.clientY, rect)) {
        if (e.buttons !== 2) {
          wasListJustClosed.current = true;
          doSetMultiToneTarget(undefined);
        }
      }
    }
  }

  useEffect(() => {
    if (showingToneList || showingMultiToneList) {
      window.addEventListener("pointerdown", onMouseDown);
    }

    return () => {
      window.removeEventListener("pointerdown", onMouseDown);
    };
  }, [showingToneList, showingMultiToneList]);

  const bodyContent: any = useMemo(() => {
    listData.current = [];

    if (emojiPickerPopup === undefined) {
      clear();
      return <></>;
    }

    if (search == "") {
      for (var category in emojiMap) {
        listData.current.push(category);
        for (var i = 0; i < emojiMap[category].length; i += 9) {
          const row = emojiMap[category].slice(i, i + 9);
          listData.current.push(row);
        }
      }
    } else {
      const results = EmojiSearchByPartialName(search);

      if (results.length === 0) {
        return (
          <div className="emoji-picker-no-results text-heading-small">
            <span>Nothing found</span>
          </div>
        );
      }

      for (let i = 0; i < results.length; i += 9) {
        const row = results.slice(i, i + 9);
        listData.current.push(row);
      }
    }

    if (selectedEmoji === undefined) {
      for (let i = 0; i < listData.current.length; i++) {
        const item = listData.current[i];
        if (typeof item !== "string") {
          const rowItem = item as EmojiEntry[];
          if (rowItem.length > 0) {
            doSetSelectedEmoji(rowItem[0]);
            break;
          }
        }
      }
    }

    if (firstLoad) {
      requestAnimationFrame(() => {
        setFirstLoad(false);
      });
      return <></>;
    }

    return (
      <EmojiPickerBody
        data={listData}
        listRef={listRef}
        onScroll={() => {
          syncCurrentCategory();
          doSetMultiToneTarget(undefined);
        }}
        onSelect={(emoji) => {
          if (selectedEmoji?.symbol !== emoji.symbol) {
            doSetSelectedEmoji(emoji);
          }
        }}
        onClick={(emoji) => {
          if (wasListJustClosed.current) {
            wasListJustClosed.current = false;
            return;
          }
          pickEmoji(emoji);
        }}
        onMultiTone={(target) => {
          doSetMultiToneTarget(target);
        }}
      />
    );
  }, [emojiPickerPopup, search, firstLoad, showingMultiToneList]);

  const categoryContent: any = useMemo(() => {
    return (
      <div className="emoji-picker-categories">
        {Object.keys(emojiMap).map((category) => (
          <IconButton
            key={category}
            className={selectedCategory === category ? "selected" : ""}
            onClick={() => {
              listRef.current?.scrollToIndex(
                listData.current.indexOf(category),
                {
                  align: "start",
                  smooth: false,
                }
              );
            }}
          >
            <CategoryIcon category={category} />
          </IconButton>
        ))}
      </div>
    );
  }, [selectedCategory]);

  if (emojiPickerPopup == undefined) {
    return <></>;
  }

  var flip = false;
  if (
    emojiPickerPopup.direction == "bottom" &&
    emojiPickerPopup.position.y < 508
  ) {
    flip = true;
  }

  return (
    <ClickWrapper
      passthrough={false}
      onClick={() => {
        setEmojiPickerPopup(undefined);
      }}
    >
      <div className="layer-container layer-popup">
        <div
          className={
            "emoji-picker-popup emoji-picker-popup-" +
            emojiPickerPopup.direction +
            (flip ? " flip" : "")
          }
          style={{
            bottom: emojiPickerPopup.position.y,
            right: emojiPickerPopup.position.x,
          }}
        >
          <div className="emoji-picker-header">
            <div className="text-input emoji-picker-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search emojis..."
                value={search}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearch(query);
                  setSelectedCategory(query == "" ? "people" : "");
                  doSetSelectedEmoji(undefined);
                }}
              />
              <BiSearch />
            </div>
            <IconButton
              onClick={() => {
                setShowingToneList(true);
              }}
            >
              <EmojiPNG symbol={toneSymbols[selectedTone]} size={24} />
            </IconButton>
            {showingToneList && (
              <div ref={toneListRef} className="emoji-picker-tone-list">
                {toneSymbols.map((symbol, index) => (
                  <IconButton
                    key={index}
                    onClick={() => {
                      doSetSelectedTone(index);
                      setShowingToneList(false);
                    }}
                  >
                    <EmojiPNG symbol={symbol} size={24} />
                  </IconButton>
                ))}
              </div>
            )}
          </div>
          {categoryContent}
          {bodyContent}
          <div className="emoji-picker-footer">
            {selectedEmoji && (
              <>
                <EmojiPNG
                  symbol={selectedEmoji?.symbol || ""}
                  size={28}
                  key={selectedEmoji?.symbol || ""}
                />
                <span>
                  {selectedEmoji?.names.map((name) => `:${name}:`).join(" ")}{" "}
                  <span
                    style={{ display: "none" }}
                    className="emoji-picker-information"
                  >
                    {EmojiToCodePoint(selectedEmoji?.symbol)}
                  </span>
                  <span className="emoji-picker-information">
                    {selectedEmojiCountry}
                  </span>
                </span>
              </>
            )}
          </div>
          {showingMultiToneList && (
            <div
              ref={multiToneListRef}
              className="emoji-picker-multi-tone-list"
              style={{
                top: multiToneTarget?.rect.top || 0,
                left:
                  (multiToneTarget?.rect.left + multiToneTarget?.rect.right) /
                    2 || 0,
              }}
            >
              {multiToneTarget.emoji.diversityChildren
                ?.slice((selectedTone - 1) * 5, selectedTone * 5)
                .map((childEmoji, index) => (
                  <button
                    key={index}
                    className={`emoji-picker-entry ${
                      selectedEmoji?.symbol === childEmoji.symbol
                        ? "selected"
                        : ""
                    }`}
                    onMouseMove={() => doSetSelectedEmoji(childEmoji)}
                    onClick={() => {
                      pickEmoji(childEmoji);
                    }}
                  >
                    <EmojiPNG symbol={childEmoji.symbol} />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </ClickWrapper>
  );
}
