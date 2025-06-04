import { useEffect, useState, useRef, useMemo, Suspense } from "react";

import { VList, VListHandle } from "virtua";

import { useChatState, useChatStateShallow } from "../../../state";

import { BiSearch } from "react-icons/bi";

import { ClickWrapper, IconButton } from "../../Common";

import { BoundingBox } from "../../../util";

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
} from "../../../emoji.tsx";
import { set } from "date-fns";

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

function EmojiPickerEntry({
  emoji,
  selectedTone,
  isSelected,
  onSelect,
  onClick,
  onContextMenu,
}: {
  emoji: EmojiEntry;
  selectedTone: number;
  isSelected: (emoji: EmojiEntry) => boolean;
  onSelect: (emoji: EmojiEntry) => void;
  onClick: (emoji: EmojiEntry) => void;
  onContextMenu: (emoji: EmojiEntry, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  const shown = getEmoji(emoji, selectedTone);

  return (
    <li ref={ref}>
      <button
        className={`emoji-picker-entry ${isSelected(shown) ? "selected" : ""}`}
        onMouseMove={() => onSelect(shown)}
        onClick={() => {
          onClick(shown);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(emoji, ref.current!.getBoundingClientRect());
        }}
      >
        <EmojiPNG symbol={shown.symbol} />
      </button>
    </li>
  );
}

function EmojiPickerBody({
  data,
  listRef,
  selectedTone,
  isSelected,
  onScroll,
  onClick,
  onSelect,
  onContextMenu,
}: {
  data: React.MutableRefObject<(string | EmojiEntry[])[]>;
  listRef: React.Ref<VListHandle>;
  selectedTone: number;
  isSelected: (emoji: EmojiEntry) => boolean;
  onScroll: () => void;
  onClick: (emoji: EmojiEntry) => void;
  onSelect: (emoji: EmojiEntry) => void;
  onContextMenu: (emoji: EmojiEntry, rect: DOMRect) => void;
}) {
  return (
    <VList
      ref={listRef}
      className="thin-scrollbar emoji-picker-body"
      count={data.current.length}
      onScroll={onScroll}
    >
      {(i) => {
        const item = data.current[i];
        if (typeof item === "string") {
          return (
            <div className="emoji-picker-category">
              <CategoryIcon category={item} />
              <span className="text-heading-small">
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </span>
            </div>
          );
        } else {
          const rowItem = item as EmojiEntry[];
          return (
            <ul
              key={i}
              className={`emoji-picker-row ${i === 0 ? "first" : ""} ${
                i === data.current.length - 1 ? "last" : ""
              }`}
            >
              {rowItem.map((emoji, j) => (
                <EmojiPickerEntry
                  key={j}
                  emoji={emoji}
                  selectedTone={selectedTone}
                  isSelected={isSelected}
                  onSelect={(emoji) => {
                    onSelect(emoji);
                  }}
                  onClick={(emoji) => {
                    onClick(emoji);
                  }}
                  onContextMenu={(emoji, rect) => {
                    onContextMenu(emoji, rect);
                  }}
                />
              ))}
            </ul>
          );
        }
      }}
    </VList>
  );
}

export default function EmojiPickerPopupLayer() {
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
    | {
        rect: DOMRect;
        emoji: EmojiEntry;
      }
    | undefined
  >(undefined);
  const showingMultiToneList = multiToneTarget !== undefined;

  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState<string>("");

  const emojiPickerPopup = useChatState((state) => state.emojiPickerPopup);
  const setEmojiPickerPopup = useChatState(
    (state) => state.setEmojiPickerPopup
  );

  function pickEmoji(emoji: EmojiEntry) {
    emojiPickerPopup?.onPick(emoji.symbol);
    setEmojiPickerPopup(undefined);
  }

  function clear() {
    setSearch("");
    setSelectedCategory("people");
    setSelectedEmoji(undefined);
    setSelectedTone(0);
    setMultiToneTarget(undefined);
    setShowingToneList(false);
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
      setSelectedEmoji(tones[index]);
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
      setSelectedEmoji(getEmoji(row[hIndex], selectedTone));
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
      setSelectedTone((selectedTone + 1) % toneSymbols.length);
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
        setMultiToneTarget(undefined);
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

  useEffect(() => {
    clear();
  }, [emojiPickerPopup]);

  function onMouseDown(e: MouseEvent) {
    if (showingToneList && toneListRef.current) {
      var rect = toneListRef.current.getBoundingClientRect();
      if (!BoundingBox(e.clientX, e.clientY, rect)) {
        setShowingToneList(false);
      }
    }
    if (showingMultiToneList && multiToneListRef.current) {
      var rect = multiToneListRef.current.getBoundingClientRect();
      if (!BoundingBox(e.clientX, e.clientY, rect)) {
        if (e.buttons !== 2) {
          setMultiToneTarget(undefined);
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
            setSelectedEmoji(rowItem[0]);
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
        selectedTone={selectedTone}
        onScroll={() => {
          syncCurrentCategory();
          setMultiToneTarget(undefined);
        }}
        isSelected={(emoji) => {
          if (showingMultiToneList) {
            if (
              multiToneTarget?.emoji.diversityChildren?.some(
                (child) => child.symbol === emoji.symbol
              )
            ) {
              return false;
            }
          }
          return selectedEmoji?.symbol === emoji.symbol;
        }}
        onSelect={(emoji) => {
          if (selectedEmoji?.symbol !== emoji.symbol) {
            setSelectedEmoji(emoji);
          }
        }}
        onClick={(emoji) => {
          pickEmoji(emoji);
        }}
        onContextMenu={(emoji, rect) => {
          const hasMultiDiversity =
            emoji.hasMultiDiversity && selectedTone != 0;
          if (
            showingMultiToneList &&
            (multiToneTarget.emoji?.symbol === emoji.symbol ||
              !hasMultiDiversity)
          ) {
            setMultiToneTarget(undefined);
          } else {
            if (hasMultiDiversity) {
              setMultiToneTarget({
                rect: rect,
                emoji: emoji,
              });
            }
          }
        }}
      />
    );
  }, [
    emojiPickerPopup,
    search,
    selectedEmoji,
    selectedTone,
    firstLoad,
    showingMultiToneList,
  ]);

  if (emojiPickerPopup == undefined) {
    return <></>;
  }

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        setEmojiPickerPopup(undefined);
      }}
    >
      <div className="layer-container layer-popup">
        <div
          className={
            "emoji-picker-popup emoji-picker-popup-" +
            emojiPickerPopup.direction
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
                  setSelectedEmoji(undefined);
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
                      setSelectedTone(index);
                      setShowingToneList(false);
                    }}
                  >
                    <EmojiPNG symbol={symbol} size={24} />
                  </IconButton>
                ))}
              </div>
            )}
          </div>
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
                  {selectedEmoji?.names.map((name) => `:${name}:`).join(" ")}
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
                    onMouseMove={() => setSelectedEmoji(childEmoji)}
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
