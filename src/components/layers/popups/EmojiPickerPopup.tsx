// @refresh reset
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
  useLayoutEffect,
} from "react";

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
} from "../../../emoji";

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

class EmojiPickerState {
  bus: EventBus = new EventBus();
  search: string | undefined = undefined;
  searchResults: (string | EmojiEntry[])[] = [];
  selectedTone: number = 0;
  showingToneList: boolean = false;
  selectedEmoji?: EmojiEntry = undefined;
  multiToneTarget?: EmojiEntry = undefined;
  selectedCategory: string = "people";
  wasListJustClosed: boolean = false;

  toneSymbols: string[] = [
    EmojiLookupName("clap")!.symbol,
    ...EmojiLookupName("clap")!.diversityChildren!.map((e) => e.symbol),
  ] as const;

  searchEvent = "search" as const;
  toneEvent = "tone" as const;
  toneListEvent = "toneList" as const;
  multiToneListEvent = "multiToneList" as const;
  categoryEvent = "category" as const;
  emojiEvent(symbol: string) {
    return `emoji:${symbol}`;
  }
  selectedEvent = "selected" as const;
  multiToneSelectedEvent = "multitone" as const;

  constructor() {}

  setSearch(search: string) {
    if (this.search === search) return;
    this.search = search;
    this.bus.emit(this.searchEvent);

    const start = performance.now();
    this.searchResults = [];

    if (this.search == undefined) return;

    if (this.search == "") {
      for (var category in emojiMap) {
        this.searchResults.push(category);
        for (var i = 0; i < emojiMap[category].length; i += 9) {
          const row = emojiMap[category].slice(i, i + 9);
          this.searchResults.push(row);
        }
      }
    } else {
      const results = EmojiSearchByPartialName(this.search);
      for (let i = 0; i < results.length; i += 9) {
        const row = results.slice(i, i + 9);
        this.searchResults.push(row);
      }
    }

    var selectedEmoji = undefined;
    for (let i = 0; i < this.searchResults.length; i++) {
      const item = this.searchResults[i];
      if (typeof item !== "string") {
        const rowItem = item as EmojiEntry[];
        if (rowItem.length > 0) {
          selectedEmoji = rowItem[0];
          break;
        }
      }
    }
    this.setSelectedEmoji(selectedEmoji);

    pickerState.setSelectedCategory(this.search == "" ? "people" : "");
  }

  setSelectedTone(tone: number) {
    if (this.selectedTone === tone) return;
    this.selectedTone = tone;
    this.bus.emit(this.toneEvent);
    this.bus.emit(this.toneListEvent);
  }

  setSelectedEmoji(emoji: EmojiEntry | undefined) {
    if (this.selectedEmoji?.symbol === emoji?.symbol) return;

    const oldSelectedEmoji = this.selectedEmoji;
    this.selectedEmoji = emoji;
    if (oldSelectedEmoji !== undefined) {
      this.bus.emit(this.emojiEvent(oldSelectedEmoji.symbol));
    }
    if (emoji !== undefined) {
      this.bus.emit(this.emojiEvent(emoji.symbol));
    }

    if (
      this.multiToneTarget?.diversityChildren?.some(
        (child) => child.symbol === emoji?.symbol
      )
    ) {
      this.bus.emit(this.multiToneSelectedEvent);
    }

    this.bus.emit(this.selectedEvent);
  }

  setMultiToneTarget(target: EmojiEntry | undefined) {
    const oldMultiToneTarget = this.multiToneTarget;
    this.multiToneTarget = target;
    if (oldMultiToneTarget !== undefined) {
      this.bus.emit(this.emojiEvent(oldMultiToneTarget.symbol));
    }
    if (target !== undefined) {
      this.bus.emit(this.emojiEvent(target.symbol));
    }
    this.bus.emit(this.multiToneListEvent);

    if (this.showingToneList) {
      this.setShowingToneList(false);
    }
  }

  setShowingToneList(showing: boolean) {
    if (this.showingToneList === showing) return;
    this.showingToneList = showing;
    this.bus.emit(this.toneListEvent);

    if (this.multiToneTarget !== undefined) {
      this.setMultiToneTarget(undefined);
    }
  }

  setSelectedCategory(category: string) {
    if (this.selectedCategory === category) return;
    this.selectedCategory = category;
    this.bus.emit(this.categoryEvent);
  }

  clear() {
    pickerState.bus.clear();
    if (this.search === undefined) {
      this.setSearch("");
    }
    pickerState.setMultiToneTarget(undefined);
    pickerState.setShowingToneList(false);

    // Full reset
    pickerState.setSearch("");
    pickerState.setSelectedTone(0);
    pickerState.setSelectedCategory("people");
  }
}

const pickerState = new EmojiPickerState();

function getEmojiSelection(emoji: EmojiEntry): string {
  if (pickerState.multiToneTarget?.symbol === emoji.symbol) {
    return "disabled";
  }
  if (
    pickerState.selectedEmoji?.symbol === emoji.symbol ||
    emoji?.diversityChildren?.some(
      (child) => child.symbol === pickerState.selectedEmoji?.symbol
    )
  ) {
    return "selected";
  }
  return "";
}

function getEmojiIndex(emoji: EmojiEntry): [number, number] {
  for (let i = 0; i < pickerState.searchResults.length; i++) {
    const item = pickerState.searchResults[i];
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

function EmojiPickerEntryInternal({
  emoji,
  onSelect,
  onClick,
  onMultiTone,
}: {
  emoji: EmojiEntry;
  onSelect: (emoji: EmojiEntry) => void;
  onClick: (emoji: EmojiEntry) => void;
  onMultiTone: (target: EmojiEntry | undefined) => void;
}) {
  useEventBusDynamic(
    pickerState.bus,
    (keys) => {
      keys.push(pickerState.emojiEvent(emoji.symbol));
      if (emoji.diversityChildren) {
        for (const child of emoji.diversityChildren) {
          keys.push(pickerState.emojiEvent(child.symbol));
        }
        keys.push(pickerState.toneEvent);
      }
    },
    [emoji]
  );

  const selectedClass = getEmojiSelection(emoji);

  const shown = getEmoji(emoji, pickerState.selectedTone);

  return (
    <li id={`emoji-picker-entry-${emoji.symbol}`}>
      <div
        className={`emoji-picker-entry ${selectedClass}`}
        onMouseMove={() => onSelect(shown)}
        onClick={() => {
          onClick(shown);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          var target: EmojiEntry | undefined = emoji;
          const hasMultiDiversity =
            emoji.hasMultiDiversity && pickerState.selectedTone != 0;
          if (!hasMultiDiversity || pickerState.multiToneTarget !== undefined) {
            target = undefined;
          }

          onMultiTone(target);
        }}
      >
        <EmojiPNG symbol={shown.symbol} size={40} />
      </div>
    </li>
  );
}

const EmojiPickerEntry = memo(
  EmojiPickerEntryInternal,
  (prevProps, nextProps) => {
    return prevProps.emoji.symbol === nextProps.emoji.symbol;
  }
);

function EmojiPickerRow({
  rowIndex,
  onClick,
  onSelect,
  onMultiTone,
}: {
  rowIndex: number;
  onClick: (e: EmojiEntry) => void;
  onSelect: (e: EmojiEntry) => void;
  onMultiTone: (target: EmojiEntry | undefined) => void;
}) {
  const rowItems = pickerState.searchResults[rowIndex] as EmojiEntry[];
  return (
    <ul className={`emoji-picker-row ${rowIndex === 0 ? "first" : ""}`}>
      {rowItems.map((emoji, i) => (
        <EmojiPickerEntry
          key={i}
          emoji={emoji}
          onClick={onClick}
          onSelect={onSelect}
          onMultiTone={onMultiTone}
        />
      ))}
    </ul>
  );
}

function EmojiPickerBody({
  listRef,
  onScroll,
  onClick,
  onSelect,
  onMultiTone,
}: {
  listRef: React.Ref<VListHandle>;
  onScroll: () => void;
  onClick: (emoji: EmojiEntry) => void;
  onSelect: (emoji: EmojiEntry) => void;
  onMultiTone: (target: EmojiEntry | undefined) => void;
}) {
  useEventBus(pickerState.bus, pickerState.searchEvent, () => {});

  if (pickerState.searchResults.length === 0) {
    return (
      <div className="emoji-picker-no-results text-heading-small">
        <span>Nothing found</span>
      </div>
    );
  } else {
    return (
      <VList
        ref={listRef}
        className="thin-scrollbar emoji-picker-body"
        count={pickerState.searchResults.length}
        onScroll={onScroll}
      >
        {(index) => {
          const row = pickerState.searchResults[index];
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
}

function EmojiPickerMultitoneList({
  listRef,
  pickEmoji,
}: {
  listRef?: React.Ref<HTMLDivElement>;
  pickEmoji: (emoji: EmojiEntry) => void;
}) {
  useEventBusDynamic(pickerState.bus, (keys) => {
    keys.push(pickerState.multiToneListEvent);
    keys.push(pickerState.multiToneSelectedEvent);
  });

  if (
    pickerState.multiToneTarget === undefined ||
    pickerState.multiToneTarget.diversityChildren === undefined
  ) {
    return <></>;
  }

  const multiToneRect = document
    .getElementById(`emoji-picker-entry-${pickerState.multiToneTarget.symbol}`)
    ?.getBoundingClientRect();

  if (multiToneRect === undefined) {
    return <></>;
  }

  return (
    <div
      ref={listRef}
      className="emoji-picker-multi-tone-list"
      style={{
        top: multiToneRect.top || 0,
        left: (multiToneRect.left + multiToneRect.right) / 2 || 0,
      }}
    >
      {pickerState.multiToneTarget.diversityChildren
        ?.slice(
          (pickerState.selectedTone - 1) * 5,
          pickerState.selectedTone * 5
        )
        .map((childEmoji, index) => (
          <button
            key={index}
            className={`emoji-picker-entry ${
              pickerState.selectedEmoji?.symbol === childEmoji.symbol
                ? "selected"
                : ""
            }`}
            onMouseMove={() => pickerState.setSelectedEmoji(childEmoji)}
            onClick={() => {
              pickEmoji(childEmoji);
            }}
          >
            <EmojiPNG symbol={childEmoji.symbol} size={40} />
          </button>
        ))}
    </div>
  );
}

function EmojiPickerToneList({
  listRef,
}: {
  listRef?: React.Ref<HTMLDivElement>;
}) {
  useEventBusDynamic(pickerState.bus, (keys) => {
    keys.push(pickerState.toneListEvent);
    keys.push(pickerState.toneEvent);
  });

  return (
    <>
      <IconButton
        onClick={() => {
          pickerState.setShowingToneList(true);
        }}
      >
        <EmojiPNG
          symbol={pickerState.toneSymbols[pickerState.selectedTone]}
          size={24}
        />
      </IconButton>
      {pickerState.showingToneList && (
        <div ref={listRef} className="emoji-picker-tone-list">
          {pickerState.toneSymbols.map((symbol, index) => (
            <IconButton
              key={index}
              onClick={() => {
                pickerState.setSelectedTone(index);
                pickerState.setShowingToneList(false);
              }}
              className={pickerState.selectedTone === index ? "hover" : ""}
            >
              <EmojiPNG symbol={symbol} size={24} />
            </IconButton>
          ))}
        </div>
      )}
    </>
  );
}

function EmojiPickerFooter() {
  useEventBus(pickerState.bus, pickerState.selectedEvent, () => {});
  return (
    <div className="emoji-picker-footer">
      {pickerState.selectedEmoji && (
        <>
          <EmojiPNG
            symbol={pickerState.selectedEmoji?.symbol || ""}
            size={28}
            key={pickerState.selectedEmoji?.symbol || ""}
          />
          <span>
            {pickerState.selectedEmoji?.names
              .map((name) => `:${name}:`)
              .join(" ")}{" "}
            <span
              style={{ display: "none" }}
              className="emoji-picker-information"
            >
              {EmojiToCodePoint(pickerState.selectedEmoji?.symbol)}
            </span>
            <span className="emoji-picker-information">
              {EmojiCountryByFlag(pickerState.selectedEmoji?.names[0] ?? "")}
            </span>
          </span>
        </>
      )}
    </div>
  );
}

function EmojiPickerCategoryList({
  listRef,
}: {
  listRef: React.RefObject<VListHandle>;
}) {
  useEventBus(pickerState.bus, pickerState.categoryEvent, () => {});
  return (
    <div className="emoji-picker-categories">
      {Object.keys(emojiMap).map((category) => (
        <IconButton
          key={category}
          className={
            pickerState.selectedCategory === category ? "selected" : ""
          }
          onClick={() => {
            listRef.current?.scrollToIndex(
              pickerState.searchResults.indexOf(category),
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
}

function EmojiPickerSearch({
  searchRef,
}: {
  searchRef: React.Ref<HTMLInputElement>;
}) {
  useEventBus(pickerState.bus, pickerState.searchEvent, () => {});
  return (
    <div className="text-input emoji-picker-search">
      <input
        ref={searchRef}
        type="text"
        placeholder="Search emojis..."
        value={pickerState.search}
        onChange={(e) => {
          const query = e.target.value;
          pickerState.setSearch(query);
        }}
      />
      <BiSearch />
    </div>
  );
}

export default function EmojiPickerPopup() {
  const listRef = useRef<VListHandle>(null);
  const toneListRef = useRef<HTMLDivElement>(null);
  const multiToneListRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearchRef = useCallback((el: HTMLInputElement | null) => {
    searchRef.current = el;
    if (el) {
      el.focus();
    }
  }, []);

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

  function syncCurrentCategory() {
    var category = "";
    const currentIndex = (listRef.current?.findStartIndex() || 0) + 4;
    for (let i = 0; i <= currentIndex; i++) {
      const item = pickerState.searchResults[i];
      if (typeof item === "string") {
        category = item as string;
      }
    }
    pickerState.setSelectedCategory(category);
  }

  function tryMoveSelection(vDelta: number, hDelta: number) {
    pickerState.setShowingToneList(false);

    if (pickerState.multiToneTarget !== undefined) {
      var [vIndex, hIndex] = getEmojiIndex(pickerState.multiToneTarget);
      const emoji = pickerState.searchResults[vIndex][hIndex] as EmojiEntry;
      const tones = emoji.diversityChildren!.slice(
        (pickerState.selectedTone - 1) * 5,
        pickerState.selectedTone * 5
      );
      var index = tones.findIndex(
        (e) => e.symbol === pickerState.selectedEmoji?.symbol
      );
      index = Math.max(0, Math.min(4, index + hDelta));
      pickerState.setSelectedEmoji(tones[index]);
      return;
    }

    if (pickerState.selectedEmoji === undefined) return;

    var [vIndex, hIndex] = getEmojiIndex(pickerState.selectedEmoji);

    if (vIndex === -1 || hIndex === -1) {
      return;
    }

    function getRow(index: number): EmojiEntry[] {
      return pickerState.searchResults[index] as EmojiEntry[];
    }

    function incV(delta: number, skip: boolean = true) {
      vIndex += delta;
      if (typeof pickerState.searchResults[vIndex] === "string") {
        vIndex += delta;
      }
      if (skip && hIndex >= getRow(vIndex)?.length) {
        vIndex += delta;
      }
      if (typeof pickerState.searchResults[vIndex] === "string") {
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
      pickerState.setSelectedEmoji(
        getEmoji(row[hIndex], pickerState.selectedTone)
      );
      if (listRef.current) {
        const first =
          vIndex === 0 ||
          (vIndex === 1 && typeof pickerState.searchResults[0] === "string");
        listRef.current.scrollToIndex(vIndex, {
          align: first ? "center" : "nearest",
        });
      }
      return true;
    }

    return false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey) {
      if (e.key === "ArrowDown") {
        pickerState.setShowingToneList(true);
        pickerState.setSelectedTone(
          (pickerState.selectedTone + 1) % pickerState.toneSymbols.length
        );
        return;
      } else if (e.key === "ArrowUp") {
        pickerState.setShowingToneList(true);
        pickerState.setSelectedTone(
          (pickerState.selectedTone - 1 + pickerState.toneSymbols.length) %
            pickerState.toneSymbols.length
        );
        return;
      }
    }

    if (e.shiftKey && e.key === "ArrowUp") {
      if (pickerState.selectedEmoji !== undefined) {
        const [vIndex, hIndex] = getEmojiIndex(pickerState.selectedEmoji);
        const emoji = pickerState.searchResults[vIndex][hIndex] as EmojiEntry;
        if (emoji.diversityChildren) {
          pickerState.setMultiToneTarget(emoji);
          return;
        }
      }
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
      if (pickerState.showingToneList) {
        pickerState.setShowingToneList(false);
      } else if (pickerState.multiToneTarget !== undefined) {
        pickerState.setMultiToneTarget(undefined);
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
  }, [emojiPickerPopup]);

  function onMouseDown(e: MouseEvent) {
    if (pickerState.showingToneList && toneListRef.current) {
      var rect = toneListRef.current.getBoundingClientRect();
      if (!isInsideRect(e.clientX, e.clientY, rect)) {
        pickerState.wasListJustClosed = true;
        pickerState.setShowingToneList(false);
      }
    }
    if (pickerState.multiToneTarget !== undefined && multiToneListRef.current) {
      var rect = multiToneListRef.current.getBoundingClientRect();
      if (!isInsideRect(e.clientX, e.clientY, rect)) {
        if (e.buttons !== 2) {
          pickerState.wasListJustClosed = true;
          pickerState.setMultiToneTarget(undefined);
        }
      }
    }
  }

  useEffect(() => {
    window.addEventListener("pointerdown", onMouseDown);
    return () => {
      window.removeEventListener("pointerdown", onMouseDown);
    };
  }, [toneListRef, multiToneListRef]);

  if (emojiPickerPopup === undefined) {
    return <></>;
  } else {
    pickerState.clear();
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
              <EmojiPickerSearch searchRef={handleSearchRef} />
              <EmojiPickerToneList listRef={toneListRef} />
            </div>
            <EmojiPickerCategoryList listRef={listRef} />
            {
              <EmojiPickerBody
                listRef={listRef}
                onScroll={() => {
                  syncCurrentCategory();
                  pickerState.setMultiToneTarget(undefined);
                }}
                onSelect={(emoji) => {
                  if (pickerState.selectedEmoji?.symbol !== emoji.symbol) {
                    pickerState.setSelectedEmoji(emoji);
                  }
                }}
                onClick={(emoji) => {
                  if (pickerState.wasListJustClosed) {
                    pickerState.wasListJustClosed = false;
                    return;
                  }
                  pickEmoji(emoji);
                }}
                onMultiTone={(target) => {
                  pickerState.setMultiToneTarget(target);
                }}
              />
            }
            <EmojiPickerFooter />
            <EmojiPickerMultitoneList
              listRef={multiToneListRef}
              pickEmoji={pickEmoji}
            />
          </div>
        </div>
      </ClickWrapper>
    );
  }
}
