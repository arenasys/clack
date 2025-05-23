import { useEffect, useRef, useMemo } from "react";

interface anchorState {
  id: string;
  scrollAnchor: string;
  scrollTop: string;
  scrollCenter: string;
  scrollBottom: string;
  scrollAtBottom: boolean;

  scrollDefaultBottom: boolean;

  scrollPositionsStale: boolean;
  scrollPositions: { top: number | null; bottom: number | null }[];

  lastScrollHeight: number;
  lastOuterHeight: number;
  lastMutation: number;

  anchorOffset: number;
}

var globalState: Map<string, anchorState> = new Map();

function updateScrollPositions(state: anchorState, data: string[]) {
  //console.log("UPDATE SCROLL OFFSETS");
  state.scrollPositions = data.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { top: null, bottom: null };
    return { top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight };
  });
}

function fixScroll(state: anchorState, scrollEl: HTMLElement) {
  //console.log("FIX SCROLL", anchorId);

  if (state.scrollAtBottom) {
    scrollEl.scrollTop = scrollEl.scrollHeight;
  } else if (state.scrollAnchor == "") {
    if (state.scrollDefaultBottom) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    } else {
      scrollEl.scrollTop = 0;
    }
  } else {
    const anchorEl = document.getElementById(state.scrollAnchor);
    if (anchorEl) {
      if (state.anchorOffset == -1) {
        console.log("SCROLL VIA ELEMENT", state.scrollAnchor);
        anchorEl.scrollIntoView({ behavior: "instant", block: "center" });
      } else {
        const offset = anchorEl.offsetTop - scrollEl.scrollTop;

        /*console.log(
          "SCROLL VIA OFFSET",
          anchorId,
          offset,
          scrollEl.scrollHeight - offset
        );*/

        scrollEl.scrollTop = anchorEl.offsetTop - state.anchorOffset;
      }
    } else {
      console.log("MISSING ANCHOR", state.scrollAnchor);
    }
  }
}

function scrollMutation(state: anchorState) {
  const scrollEl = document.getElementById(state.id);
  if (!scrollEl) return;

  const scrollHeight = scrollEl.scrollHeight;
  if (scrollHeight != state.lastScrollHeight) {
    state.lastMutation = Date.now();
    state.lastScrollHeight = scrollHeight;
    fixScroll(state, scrollEl);
    state.scrollPositionsStale = true;
  }
}

function outerMutation(state: anchorState, ref: HTMLDivElement) {
  const scrollEl = document.getElementById(state.id);
  if (!scrollEl) return;

  const outerHeight = ref.clientHeight;
  if (outerHeight != state.lastOuterHeight) {
    console.log("OUTER HEIGHT", outerHeight, state.lastOuterHeight);
    state.lastMutation = Date.now();
    state.lastOuterHeight = outerHeight;
    fixScroll(state, scrollEl);
    state.scrollPositionsStale = true;
  }
}

function repositionScrollAnchor(state: anchorState, scrollEl: HTMLElement) {
  if (state.scrollAnchor == "") return;
  const anchorEl = document.getElementById(state.scrollAnchor);
  if (!anchorEl) return;

  state.anchorOffset = anchorEl.offsetTop - scrollEl.scrollTop;
}

async function resyncScrollAnchors(
  state: anchorState,
  outerRef: React.RefObject<HTMLDivElement>,
  messageView: string[],
  anchor: string,
  setAnchor: (top: string, center: string, bottom: string) => void
) {
  if (!outerRef.current) return;

  if (messageView.length == 0) return;

  const currentTop = outerRef.current.scrollTop;
  const currentBottom =
    outerRef.current.scrollTop + outerRef.current.clientHeight;
  const currentCenter =
    outerRef.current.scrollTop + outerRef.current.clientHeight / 2;

  var top = 0;
  var bottom = messageView.length - 1;
  var center = messageView.length - 1;

  for (var i = 0; i < messageView.length; i++) {
    const pos = state.scrollPositions[i];
    if (pos.top === null || pos.bottom === null) continue;
    if (pos.bottom < currentTop) continue;
    if (pos.top > currentBottom) continue;

    if (pos.top - 20 <= currentTop && pos.bottom + 10 >= currentTop) {
      top = i;
    }

    if (pos.top - 10 <= currentBottom && pos.bottom + 20 >= currentBottom) {
      bottom = i;
    }

    if (pos.top - 20 <= currentCenter && pos.bottom + 20 >= currentCenter) {
      center = i;
    }
  }

  if (state.scrollTop != messageView[top]) state.scrollTop = messageView[top];
  if (state.scrollBottom != messageView[bottom])
    state.scrollBottom = messageView[bottom];
  if (state.scrollCenter != messageView[center])
    state.scrollCenter = messageView[center];

  const atBottom = currentBottom >= outerRef.current.scrollHeight - 100;

  if (atBottom) {
    const newAnchor = messageView[messageView.length - 1];
    if (anchor != newAnchor) {
      setAnchor(state.scrollTop, newAnchor, newAnchor);
      state.scrollAnchor = newAnchor;
      state.scrollAtBottom = true;
    }
  } else {
    if (anchor != state.scrollCenter) {
      setAnchor(state.scrollTop, state.scrollCenter, state.scrollBottom);
      state.scrollAnchor = state.scrollCenter;
      state.scrollAtBottom = false;
    }
  }
}

export function List({
  id,
  className,
  data,
  anchor,
  setAnchor,
  entry,
  defaultBottom,
}: {
  id: string;
  className: string;
  data: string[];
  anchor: string;
  setAnchor: (top: string, center: string, bottom: string) => void;
  entry: (id: string) => JSX.Element;
  defaultBottom: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  if (!globalState.has(id)) {
    globalState.set(id, {
      id: id,
      scrollAnchor: "",
      scrollTop: "",
      scrollCenter: "",
      scrollBottom: "",
      scrollAtBottom: false,

      scrollDefaultBottom: defaultBottom,

      scrollPositionsStale: true,
      scrollPositions: [],

      lastScrollHeight: 0,
      lastOuterHeight: 0,
      lastMutation: 0,

      anchorOffset: -1,
    });
  }

  var state = globalState.get(id)!;

  useEffect(() => {
    if (!listRef.current) return;
    //console.log("LIST OBSERVE", listRef.current);
    const mObserver = new MutationObserver(() => scrollMutation(state));
    mObserver.observe(listRef.current, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    const rObserver = new ResizeObserver(() => scrollMutation(state));
    rObserver.observe(listRef.current);

    var oObserver: ResizeObserver | undefined = undefined;
    if (outerRef.current != null) {
      oObserver = new ResizeObserver(() => {
        outerMutation(state, outerRef.current!);
      });
      oObserver.observe(outerRef.current);
    }

    return () => {
      mObserver.disconnect();
      rObserver.disconnect();
      oObserver?.disconnect();
    };
  }, [listRef, outerRef]);

  useEffect(() => {
    //console.log("SYNC ANCHOR", anchor);
    state.scrollAnchor = anchor;
    state.scrollAtBottom = data[data.length - 1] == anchor;
    state.anchorOffset = -1;
    //console.log("ANCHOR CHANGED", anchor);
  }, [anchor]);

  const entryList = useMemo(
    () => (
      <>
        {data.map((id) => (
          <li key={id} id={id}>
            {entry(id)}
          </li>
        )) ?? []}
      </>
    ),
    [data]
  );

  return (
    <div
      id={id}
      className={`${className} ${id}-outer`}
      ref={outerRef}
      onScroll={() => {
        if (!outerRef.current) return;

        const isUncaughtMutation =
          outerRef.current.scrollHeight != state.lastScrollHeight;

        if (isUncaughtMutation) {
          scrollMutation(state);
        }

        if (state.scrollPositionsStale) {
          updateScrollPositions(state, data);
          state.scrollPositionsStale = false;
        }
        const isUserScroll =
          Date.now() - state.lastMutation > 50 && !isUncaughtMutation;

        if (isUserScroll) {
          console.log("USER SCROLL");
          repositionScrollAnchor(state, outerRef.current);
        }

        resyncScrollAnchors(state, outerRef, data, anchor, setAnchor);
      }}
    >
      <div className={`${id}-inner`} ref={innerRef}>
        <ol ref={listRef} className={`${id}-list`}>
          {entryList}
        </ol>
      </div>
    </div>
  );
}

export default List;
