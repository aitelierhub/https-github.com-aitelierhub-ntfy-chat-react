import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Input } from "../input/input";
import { Message, MessageProps } from "../message/message";
const StyledChat = styled.div`
    width: 100%;
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #bdbdbd;
  }
  &::-webkit-scrollbar-track {
    background-color: #ddd;
  }
`
const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: var(--border);
  background: #eee;
  color: #666;
`
const StyledHeaderTitle = styled.div`

`
interface Props {
    onHeaderClick: () => void
    title: string
    user: string
    room: string
    iconSource: 'pixel' | 'initials'
    translation?: Translation
    styles?: Partial<Styles>
    pulldown?: JSX.Element
}
export interface Translation {
    send: string
    placeholder: string
}
export interface Styles {
    headerColor: string;
    headerTextColor: string;
    messageBackgroundColor: string;
    messageTextColor: string;
    ownMessageBackgroundColor: string;
    ownMessageTextColor: string;
    inputBackgroundColor: string;
    inputTextColor: string;
    sendButtonBackgroundColor: string;
    sendButtonTextColor: string;
}
export const Chat = ({ room, title, user, onHeaderClick, iconSource, translation, styles, pulldown }: Props) => {
    const [messages, setMessages] = useState<MessageProps[]>([])
    
    const addMessage = useCallback((message: MessageProps) => {
        setMessages((messages) => {
            return [...messages, message]
        })
    }, [setMessages])
    useEffect(() => {
        const ROOM = room || "ntfydemochatroom";
        const SERVICE = `https://ntfy.sh/${ROOM}/sse`;
        const eventSource = new EventSource(SERVICE)
        eventSource.onmessage = (e) => {
            const data = JSON.parse(JSON.parse(e.data).message);
            const username = data.user === user ? "me" : data.user
            const encodedUser = encodeURIComponent(username)
            const message = {
                side: data.user === user ? "right" : "left",
                picture: iconSource === 'pixel' ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodedUser}` : '',
                name: username,
                fullName: data.user,
                time: data.time || Date.now(),
                message: data.message
            }
            addMessage(message)
        }

        return () => {
            eventSource.close()
        }
    }, [room, user, addMessage, iconSource])
    useEffect(() => {
        async function getMessages() {
            const ROOM = room || "ntfydemochatroom";
            const SERVICE = `https://ntfy.sh/${ROOM}/json?since=10m&poll=1`;
            const response = await fetch(SERVICE)
            if (response.status === 502) {
                getMessages()
                return;
            } else if (response.status !== 200) {
                console.error(response.statusText)
                return;
            } else {
                const data = await response.text()
                const message = data.split(/\r?\n/)
                const messages = message.map((message) => {
                    try {
                        const data = JSON.parse(JSON.parse(message).message);
                        const username = data.user === user ? "me" : data.user
                        const encodedUser = encodeURIComponent(username)
                        return {
                            side: data.user === user ? "right" : "left",
                            picture: iconSource === 'pixel' ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodedUser}` : '',
                            name: username,
                            fullName: data.user,
                            time: data.time || Date.now(),
                            message: data.message
                        }
                    } catch (error) {
                        console.error(error)
                        return {
                            side: "",
                            picture: ``,
                            name: "",
                            fullName: "",
                            time: 0,
                            message: ""
                        }
                    }

                })
                setMessages(messages.filter((message) => message.side !== ""))
            }
        }
        getMessages()
    }, [room, user, setMessages, iconSource])
    const sendMessage = useCallback((value: string) => {
        if (!value) {
            return;
        }
        const ROOM = room || "ntfydemochatroom";
        const SERVICE = `https://ntfy.sh/${ROOM}`
        fetch(SERVICE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: value,
                user: user
            })
        })
    }, [user, room])
    return (
        <>
            <StyledHeader onClick={onHeaderClick}>
                <StyledHeaderTitle>{title}</StyledHeaderTitle>
                {pulldown}
            </StyledHeader>
            <StyledChat>
                {messages.map((message, index) => (
                    <Message
                        key={index}
                        side={message.side}
                        picture={message.picture}
                        name={message.name}
                        fullName={message.fullName}
                        time={message.time}
                        message={message.message}
                    // isAFollowUp={messages[index - 1]?.fullName === message.fullName}
                    />
                ))}
            </StyledChat>
            <Input styles={styles} translation={translation} onSubmit={(value) => sendMessage(value)}></Input>
        </>
    );
}