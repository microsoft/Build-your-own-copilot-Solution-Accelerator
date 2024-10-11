import { Conversation, GroupedChatHistory, ChatMessage, ToolMessageContent } from '../api/models'

export const groupByMonth = (entries: Conversation[]) => {
    const groups: GroupedChatHistory[] = [{ month: 'Recent', entries: [] }]
    const currentDate = new Date()

    entries.forEach(entry => {
        const date = new Date(entry.date)
        const daysDifference = (currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' })
        const existingGroup = groups.find(group => group.month === monthYear)

        if (daysDifference <= 7) {
            groups[0].entries.push(entry)
        } else {
            if (existingGroup) {
                existingGroup.entries.push(entry)
            } else {
                groups.push({ month: monthYear, entries: [entry] })
            }
        }
    })

    groups.sort((a, b) => {
        // Check if either group has no entries and handle it
        if (a.entries.length === 0 && b.entries.length === 0) {
            return 0 // No change in order
        } else if (a.entries.length === 0) {
            return 1 // Move 'a' to a higher index (bottom)
        } else if (b.entries.length === 0) {
            return -1 // Move 'b' to a higher index (bottom)
        }
        const dateA = new Date(a.entries[0].date)
        const dateB = new Date(b.entries[0].date)
        return dateB.getTime() - dateA.getTime()
    })

    groups.forEach(group => {
        group.entries.sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateB.getTime() - dateA.getTime()
        })
    })

    return groups
}

export const formatMonth = (month: string) => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()

    const [monthName, yearString] = month.split(' ')
    const year = parseInt(yearString)

    if (year === currentYear) {
        return monthName
    } else {
        return month
    }
}


// -------------Chat.tsx-------------
export const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool') {
        try {
            const toolMessage = JSON.parse(message.content) as ToolMessageContent
            return toolMessage.citations
        } catch {
            return []
        }
    }
    return []
}

export const tryGetRaiPrettyError = (errorMessage: string) => {
    try {
        // Using a regex to extract the JSON part that contains "innererror"
        const match = errorMessage.match(/'innererror': ({.*})\}\}/)
        if (match) {
            // Replacing single quotes with double quotes and converting Python-like booleans to JSON booleans
            const fixedJson = match[1]
                .replace(/'/g, '"')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false')
            const innerErrorJson = JSON.parse(fixedJson)
            let reason = ''
            // Check if jailbreak content filter is the reason of the error
            const jailbreak = innerErrorJson.content_filter_result.jailbreak
            if (jailbreak.filtered === true) {
                reason = 'Jailbreak'
            }

            // Returning the prettified error message
            if (reason !== '') {
                return (
                    'The prompt was filtered due to triggering Azure OpenAI’s content filtering system.\n' +
                    'Reason: This prompt contains content flagged as ' +
                    reason +
                    '\n\n' +
                    'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
                )
            }
        }
    } catch (e) {
        console.error('Failed to parse the error:', e)
    }
    return errorMessage
}


export const parseErrorMessage = (errorMessage: string) => {
    let errorCodeMessage = errorMessage.substring(0, errorMessage.indexOf('-') + 1)
    const innerErrorCue = "{\\'error\\': {\\'message\\': "
    if (errorMessage.includes(innerErrorCue)) {
        try {
            let innerErrorString = errorMessage.substring(errorMessage.indexOf(innerErrorCue))
            if (innerErrorString.endsWith("'}}")) {
                innerErrorString = innerErrorString.substring(0, innerErrorString.length - 3)
            }
            innerErrorString = innerErrorString.replaceAll("\\'", "'")
            let newErrorMessage = errorCodeMessage + ' ' + innerErrorString
            errorMessage = newErrorMessage
        } catch (e) {
            console.error('Error parsing inner error message: ', e)
        }
    }

    return tryGetRaiPrettyError(errorMessage)
}

// -------------Chat.tsx-------------

