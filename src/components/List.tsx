import { useEffect, useRef, useMemo, memo } from "react";

interface anchorState {
  id: string;
  scrollAnchor: string;
  scrollTop: string;
  scrollCenter: string;
  scrollBottom: string;
  scrollAtBottom: boolean;
  scrollAnchorForced: boolean;

  scrollIsDragging: boolean;
  scrollDeferingFetch: boolean;

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
        console.log(
          "SCROLL VIA OFFSET",
          state.scrollAnchor,
          state.anchorOffset
        );

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
    console.log("FIX SCROLL, SCROLL MUTATION");
    fixScroll(state, scrollEl);
    state.scrollPositionsStale = true;
  }
}

function outerMutation(state: anchorState, ref: HTMLDivElement) {
  const scrollEl = document.getElementById(state.id);
  if (!scrollEl) return;

  const outerHeight = ref.clientHeight;
  if (outerHeight != state.lastOuterHeight) {
    /*console.log(
      "OUTER MUTATION",
      outerHeight,
      state.lastOuterHeight,
      Date.now()
    );*/
    state.lastMutation = Date.now();
    state.lastOuterHeight = outerHeight;
    console.log("FIX SCROLL, OUTER MUTATION");
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
  getAnchor: () => string,
  setAnchor: (
    top: string,
    center: string,
    bottom: string,
    fetch: boolean
  ) => void,
  readonly: boolean
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

  const anchor = getAnchor();

  if (atBottom) {
    var newAnchor = messageView[messageView.length - 1];
    if (readonly || state.scrollAnchorForced) {
      newAnchor = anchor;
    }

    setAnchor(state.scrollTop, newAnchor, newAnchor, !state.scrollIsDragging);

    state.scrollAnchor = newAnchor;
    state.scrollAtBottom = true;
  } else {
    var newAnchor = state.scrollCenter;

    if (readonly || state.scrollAnchorForced) {
      newAnchor = anchor;
    }

    setAnchor(
      state.scrollTop,
      newAnchor,
      state.scrollBottom,
      !state.scrollIsDragging
    );

    state.scrollAnchor = newAnchor;
    state.scrollAtBottom = false;
  }

  if (state.scrollIsDragging) state.scrollDeferingFetch = true;

  state.scrollAnchorForced = false;
}

export function List({
  id,
  className,
  data,
  getAnchor,
  setAnchor,
  entry,
  onScroll,
  defaultBottom,
}: {
  id: string;
  className: string;
  data: string[];
  getAnchor: () => string;
  setAnchor: (
    top: string,
    center: string,
    bottom: string,
    fetch: boolean
  ) => void;
  entry: (id: string) => JSX.Element;
  onScroll?: (scrollTop: number) => void;
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
      scrollAnchorForced: false,

      scrollIsDragging: false,
      scrollDeferingFetch: false,

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

  const resizeTimeout = useRef<number | undefined>(undefined);

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

    function onResize() {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      resizeTimeout.current = window.setTimeout(() => {
        if (outerRef.current != null) {
          console.log("FIX SCROLL, RESIZE");
          fixScroll(state, outerRef.current!);
        }
      }, 100);
    }

    window.addEventListener("resize", onResize);

    return () => {
      mObserver.disconnect();
      rObserver.disconnect();
      oObserver?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [listRef, outerRef]);

  useEffect(() => {
    const anchor = getAnchor();
    if (state.scrollAnchor == anchor) return;
    state.scrollAnchor = anchor;
    state.scrollAtBottom = data[data.length - 1] == anchor;
    state.anchorOffset = -1;
    state.scrollAnchorForced = true;
    console.log("FIX SCROLL, EXTERNAL", anchor);
    fixScroll(state, outerRef.current!);
  }, [getAnchor]);

  useEffect(() => {
    const onPointerDown = () => {
      state.scrollIsDragging = true;
    };
    const onPointerUp = () => {
      if (state.scrollDeferingFetch) {
        setAnchor(
          state.scrollTop,
          state.scrollAnchor,
          state.scrollBottom,
          true
        );
        state.scrollDeferingFetch = false;
      }
      state.scrollIsDragging = false;
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
    };
  });

  const entryCache = useRef<Map<string, JSX.Element>>(new Map());
  const entryList = useMemo(() => {
    data.forEach((id) => {
      if (entryCache.current.has(id)) return;
      entryCache.current.set(
        id,
        <li key={id} id={`entry-${id}`}>
          {entry(id)}
        </li>
      );
    });

    entryCache.current.forEach((_, key) => {
      if (!data.includes(key)) {
        entryCache.current.delete(key);
      }
    });

    return <>{data.map((id) => entryCache.current.get(id)) ?? []}</>;
  }, [data, entry]);

  function handleOnScroll() {
    if (!outerRef.current) return;

    if (onScroll) {
      onScroll(outerRef.current.scrollTop);
    }

    const isUncaughtMutation =
      outerRef.current.scrollHeight != state.lastScrollHeight ||
      outerRef.current.clientHeight != state.lastOuterHeight;

    if (isUncaughtMutation) {
      scrollMutation(state);
      outerMutation(state, outerRef.current);
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
    } else {
      console.log("FIX SCROLL, NON USER SCROLL MUTATION");
      fixScroll(state, outerRef.current);
    }

    resyncScrollAnchors(
      state,
      outerRef,
      data,
      getAnchor,
      setAnchor,
      !isUserScroll
    );
  }

  return (
    <div
      id={id}
      className={`${className} ${id}-outer`}
      ref={outerRef}
      onScroll={() => {
        handleOnScroll();
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
