import {
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { HiOutlineHashtag } from "react-icons/hi";

import { useClackState, getClackState, ClackEvents } from "../state";

import { User, Role, Channel, Emoji } from "../types";

import { FormatColor } from "../util";

import { EmojiEntry, EmojiInline, EmojiLookupSymbol } from "../emoji";

import { UserAvatarSVG } from "./Users";

export interface AutocompleteRef {
  onKeyDown: (event: React.KeyboardEvent) => boolean;
  onValue: (text: string, cursor: number) => void;
}

export const Autocomplete = forwardRef(function Autocomplete(
  {
    onComplete,
  }: {
    onComplete: (word: string, completion: string) => void;
  },
  ref
) {
  const [word, setWord] = useState("");
  const [index, setIndex] = useState(0);
  const [isKeyboard, setIsKeyboard] = useState(false);

  const [emojiResults, setEmojiResults] = useState<Emoji[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);
  const [roleResults, setRoleResults] = useState<Role[]>([]);
  const [channelResults, setChannelResults] = useState<Channel[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const searchEmojis = getClackState((state) => state.chat.searchEmojis);
  const searchUsers = getClackState((state) => state.chat.searchUsers);
  const searchRoles = getClackState((state) => state.chat.searchRoles);
  const searchChannels = getClackState((state) => state.chat.searchChannels);

  function getResultsLength() {
    return (
      emojiResults.length +
      userResults.length +
      roleResults.length +
      channelResults.length
    );
  }

  function getSelectedCompletion(): string {
    if (index == -1) {
      return "";
    }

    if (emojiResults.length > 0) {
      const entry = EmojiLookupSymbol(emojiResults[index].name)!;
      return `:${entry.names[0]}: `;
    }

    if (userResults.length > 0 && index < userResults.length) {
      return `@${userResults[index].userName} `;
    }

    if (roleResults.length > 0) {
      return `@${roleResults[index - userResults.length].name} `;
    }

    if (channelResults.length > 0) {
      return `#${channelResults[index].name} `;
    }

    return "";
  }

  function syncEmojiSearch(word: string) {
    const mx = 50;

    if (word.length <= 2 || word[0] != ":") {
      setEmojiResults([]);
      return;
    }

    const query = word.slice(1).toLowerCase();
    const results = searchEmojis(query);

    if (results.length > mx) {
      results.length = mx;
    }

    setEmojiResults(results);
  }

  function syncMemberSearch(word: string) {
    const mx = 10;
    const mx_role = 5;

    if (word.length == 0 || word[0] != "@") {
      setUserResults([]);
      setRoleResults([]);
      return;
    }

    const query = word.slice(1).toLowerCase();
    const userResults = searchUsers(query);
    const roleResults = searchRoles(query);

    if (userResults.length > 10) {
      userResults.length = 10;
    }

    if (roleResults.length > 10) {
      roleResults.length = 10;
    }

    var userCount = Math.min(userResults.length, mx);
    var roleCount = Math.min(roleResults.length, mx);
    if (
      userResults.length > 0 &&
      roleResults.length > 0 &&
      userCount + roleCount > mx
    ) {
      if (userCount >= mx) {
        roleCount = Math.min(roleCount, mx_role);
        userCount = Math.min(userCount, mx - roleCount);
      } else {
        roleCount = Math.min(roleCount, mx);
        userCount = Math.min(userCount, mx - roleCount);
      }
    }

    userResults.length = userCount;
    roleResults.length = roleCount;

    setUserResults(userResults);
    setRoleResults(roleResults);
  }

  function syncChannelSearch(word: string) {
    const mx = 10;

    if (word.length == 0 || word[0] != "#") {
      setChannelResults([]);
      return;
    }

    const query = word.slice(1).toLowerCase();
    const results = searchChannels(query);

    if (results.length > mx) {
      results.length = mx;
    }

    console.log("CHANNELS", results, query);

    setChannelResults(results);
  }

  function changeIndex(newIndex: number, keyboard: boolean) {
    setIsKeyboard(keyboard);
    setIndex(newIndex);
  }

  function moveIndex(i: number, keyboard: boolean) {
    if (index == -1) {
      changeIndex(0, keyboard);
      return;
    }
    const l = getResultsLength();
    var n = i % l;
    if (n < 0) n += l;
    changeIndex(n, keyboard);
  }

  function doSetWord(word: string) {
    changeIndex(0, true);
    setWord(word);
    syncEmojiSearch(word);
    syncMemberSearch(word);
    syncChannelSearch(word);
    scrollRef.current?.scrollTo(0, 0);
  }

  function doSelectUp() {
    moveIndex(index - 1, true);
  }

  function doSelectDown() {
    moveIndex(index + 1, true);
  }

  function isShowing(): boolean {
    return getResultsLength() > 0;
  }

  function isCompletable(): boolean {
    return getResultsLength() > 0 && index >= 0;
  }

  function doComplete(): void {
    const completion = getSelectedCompletion();
    if (completion.length > 0) {
      onComplete(word, completion);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    var handled = false;
    if (isShowing()) {
      if (event.key === "ArrowUp") {
        handled = true;
        doSelectUp();
      } else if (event.key === "ArrowDown") {
        handled = true;
        doSelectDown();
      } else if (event.key === "Tab" && isCompletable()) {
        handled = true;
        doComplete();
      } else if (event.key === "Enter" && !event.shiftKey && isCompletable()) {
        handled = true;
        doComplete();
      } else if (event.key === "Escape") {
        handled = true;
        doSetWord("");
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    return handled;
  }

  function doScrollTo(index: number, top: number, height: number) {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const scrollHeight = scrollRef.current.scrollHeight;
      const clientHeight = scrollRef.current.clientHeight;
      const padding = 8;

      if (index == 0) {
        scrollRef.current.scrollTo({
          top: 0,
          behavior: "instant",
        });
      } else if (index == getResultsLength() - 1) {
        scrollRef.current.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: "instant",
        });
      } else if (top < scrollTop) {
        scrollRef.current.scrollTo({
          top: top - padding,
          behavior: "instant",
        });
      } else if (top + height > scrollTop + clientHeight) {
        scrollRef.current.scrollTo({
          top: top + height - clientHeight + padding,
          behavior: "instant",
        });
      }
    }
  }

  useImperativeHandle(ref, () => ({
    onValue(text: string, cursor: number) {
      if (cursor == -1) {
        doSetWord("");
      } else {
        const currentWord = text.slice(0, cursor).split(/\s|>/g).pop();
        if (currentWord === undefined) {
          doSetWord("");
        } else {
          doSetWord(currentWord);
        }
      }
    },
    onKeyDown: (event: KeyboardEvent) => onKeyDown(event),
  }));

  if (closed) {
    return <></>;
  }

  const anyResults =
    emojiResults.length > 0 ||
    userResults.length > 0 ||
    roleResults.length > 0 ||
    channelResults.length > 0;

  const memberLabel = userResults.length > 0 ? "Users" : "Roles";

  if (anyResults) {
    return (
      <div ref={scrollRef} className="autocomplete thin-scrollbar">
        {emojiResults.length > 0 && (
          <AutocompleteCategory text={`Emoji matching ${word}`} />
        )}
        {emojiResults.map((result, i) => {
          const entry = EmojiLookupSymbol(result.name)!;
          return (
            <AutocompleteEmoji
              key={result.name}
              emoji={entry}
              index={i}
              selected={index == i}
              jump={(top, height) => {
                if (!isKeyboard) return;
                doScrollTo(i, top, height);
              }}
              onMouseMove={() => {
                if (index != i) changeIndex(i, false);
              }}
              onClick={() => {
                onComplete(word, `:${entry.names[0]}: `);
              }}
            />
          );
        })}

        {(userResults.length > 0 || roleResults.length > 0) && (
          <AutocompleteCategory text={`${memberLabel} matching ${word}`} />
        )}
        {userResults.map((result, i) => {
          return (
            <AutocompleteUser
              key={result.id}
              user={result}
              index={i}
              selected={index == i}
              jump={(top, height) => {
                if (!isKeyboard) return;
                doScrollTo(i, top, height);
              }}
              onMouseMove={() => {
                if (index != i) changeIndex(i, false);
              }}
              onClick={() => {
                onComplete(word, `@${result.userName} `);
              }}
            />
          );
        })}
        {userResults.length > 0 && roleResults.length > 0 && (
          <AutocompleteDivider />
        )}
        {roleResults.map((result, _i) => {
          const i = _i + userResults.length;
          return (
            <AutocompleteRole
              key={result.id}
              _role={result}
              index={i}
              selected={index == i}
              jump={(top, height) => {
                if (!isKeyboard) return;
                doScrollTo(i, top, height);
              }}
              onMouseMove={() => {
                if (index != i) changeIndex(i, false);
              }}
              onClick={() => {
                onComplete(word, `@${result.name} `);
              }}
            />
          );
        })}
        {channelResults.length > 0 && (
          <AutocompleteCategory text={`Channels matching ${word}`} />
        )}
        {channelResults.map((result, i) => {
          return (
            <AutocompleteChannel
              key={result.id}
              channel={result}
              index={i}
              selected={index == i}
              jump={(top, height) => {
                if (!isKeyboard) return;
                doScrollTo(i, top, height);
              }}
              onMouseMove={() => {
                if (index != i) changeIndex(i, false);
              }}
              onClick={() => {
                onComplete(word, `#${result.name} `);
              }}
            />
          );
        })}
      </div>
    );
  }
  return <></>;
});

function AutocompleteCategory({ text }: { text: String }) {
  return <div className="autocomplete-category text-heading-small">{text}</div>;
}

function AutocompleteDivider({}: {}) {
  return <div className="autocomplete-divider"></div>;
}

function AutocompleteEmoji({
  emoji,
  index,
  selected,
  jump,
  ...rest
}: {
  emoji: EmojiEntry;
  index: number;
  selected: boolean;
  jump: (top: number, height: number) => void;
} & React.HTMLProps<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      jump(ref.current.offsetTop, ref.current.offsetHeight);
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className={`autocomplete-entry small ${selected ? "selected" : ""}`}
      {...rest}
    >
      <div className="autocomplete-icon">
        <EmojiInline text={emoji.symbol} />
      </div>
      <div className="autocomplete-text">{`:${emoji.names[0]}:`}</div>
    </div>
  );
}

function AutocompleteUser({
  user,
  index,
  selected,
  jump,
  ...rest
}: {
  user: User;
  index: number;
  selected: boolean;
  jump: (top: number, height: number) => void;
} & React.HTMLProps<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      jump(ref.current.offsetTop, ref.current.offsetHeight);
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className={`autocomplete-entry ${selected ? "selected" : ""}`}
      {...rest}
    >
      <div className="autocomplete-icon user">
        <UserAvatarSVG user={user} size={30} />
      </div>
      <div className="autocomplete-text">{user.displayName}</div>
      <div className="autocomplete-subtext">{user.userName}</div>
    </div>
  );
}

function AutocompleteRole({
  _role,
  index,
  selected,
  jump,
  ...rest
}: {
  _role: Role;
  index: number;
  selected: boolean;
  jump: (top: number, height: number) => void;
} & React.HTMLProps<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      jump(ref.current.offsetTop, ref.current.offsetHeight);
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className={`autocomplete-entry small ${selected ? "selected" : ""}`}
      {...rest}
    >
      <div
        className="autocomplete-text"
        style={{ color: FormatColor(_role.color) }}
      >
        {"@" + _role.name}
      </div>
      <div className="autocomplete-subtext">
        {"Notify users with this role."}
      </div>
    </div>
  );
}

function AutocompleteChannel({
  channel,
  index,
  selected,
  jump,
  ...rest
}: {
  channel: Channel;
  index: number;
  selected: boolean;
  jump: (top: number, height: number) => void;
} & React.HTMLProps<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      jump(ref.current.offsetTop, ref.current.offsetHeight);
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className={`autocomplete-entry small ${selected ? "selected" : ""}`}
      {...rest}
    >
      <div className="autocomplete-icon channel">
        <HiOutlineHashtag />
      </div>
      <div className="autocomplete-text">{channel.name}</div>
      {channel.parentName && (
        <div className="autocomplete-subtext">{channel.parentName}</div>
      )}
    </div>
  );
}
