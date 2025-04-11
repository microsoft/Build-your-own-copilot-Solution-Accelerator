import { groupByMonth, formatMonth, parseCitationFromMessage, parseErrorMessage, tryGetRaiPrettyError } from './helpers';
import { ChatMessage, Conversation } from '../api/models';

describe('groupByMonth', () => {

    test('should group recent conversations into the "Recent" group when the difference is less than or equal to 7 days', () => {
        const currentDate = new Date();
        const recentDate = new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
        const entries: Conversation[] = [
            {
                id: '1',
                title: 'Recent Conversation',
                date: recentDate.toISOString(),
                messages: [],
            },
        ];
        const result = groupByMonth(entries);
        expect(result[0].month).toBe('Recent');
        expect(result[0].entries.length).toBe(1);
        expect(result[0].entries[0].id).toBe('1');
    });

    test('should group conversations by month when the difference is more than 7 days', () => {
        const entries: Conversation[] = [
            {
                id: '1',
                title: 'Older Conversation',
                date: '2024-09-01T10:26:03.844538',
                messages: [],
            },
            {
                id: '2',
                title: 'Another Older Conversation',
                date: '2024-08-01T10:26:03.844538',
                messages: [],
            },

            {
                id: '3',
                title: 'Older Conversation',
                date: '2024-10-08T10:26:03.844538',
                messages: [],
            },
        ];

        const result = groupByMonth(entries);
        expect(result[1].month).toBe('September 2024');
        expect(result[1].entries.length).toBe(1);
        expect(result[2].month).toBe('August 2024');
        expect(result[2].entries.length).toBe(1);
    });

    test('should push entries into an existing group if the group for that month already exists', () => {
        const entries: Conversation[] = [
            {
                id: '1',
                title: 'First Conversation',
                date: '2024-09-08T10:26:03.844538',
                messages: [],
            },
            {
                id: '2',
                title: 'Second Conversation',
                date: '2024-09-10T10:26:03.844538',
                messages: [],
            },
        ];

        const result = groupByMonth(entries);

        expect(result[0].month).toBe('September 2024');
        expect(result[0].entries.length).toBe(2);
    });

});

describe('formatMonth', () => {

    it('should return the month name if the year is the current year', () => {
        const currentYear = new Date().getFullYear();
        const month = `${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}`;

        const result = formatMonth(month);

        expect(result).toEqual(new Date().toLocaleString('default', { month: 'long' }));
    });

    it('should return the full month string if the year is not the current year', () => {
        const month = 'January 2023'; // Assuming the current year is 2024
        const result = formatMonth(month);

        expect(result).toEqual(month);
    });

    it('should handle invalid month format gracefully', () => {
        const month = 'Invalid Month Format';
        const result = formatMonth(month);

        expect(result).toEqual(month);
    });

    it('should return the full month string if the month is empty', () => {
        const month = ' ';
        const result = formatMonth(month);

        expect(result).toEqual(month);
    });

});

describe('parseCitationFromMessage', () => {

    it('should return citations when the message role is "tool" and content is valid JSON', () => {
        const message: ChatMessage = {
            id: '1',
            role: 'tool',
            content: JSON.stringify({
                citations: ['citation1', 'citation2'],
            }),
            date: new Date().toISOString(),
        };

        const result = parseCitationFromMessage(message);

        expect(result).toEqual(['citation1', 'citation2']);
    });

    it('should return an empty array if the message role is not "tool"', () => {
        const message: ChatMessage = {
            id: '2',
            role: 'user',
            content: JSON.stringify({
                citations: ['citation1', 'citation2'],
            }),
            date: new Date().toISOString(),
        };

        const result = parseCitationFromMessage(message);

        expect(result).toEqual([]);
    });

    it('should return an empty array if the content is not valid JSON', () => {
        const message: ChatMessage = {
            id: '3',
            role: 'tool',
            content: 'invalid JSON content',
            date: new Date().toISOString(),
        };

        const result = parseCitationFromMessage(message);

        expect(result).toEqual([]);
    });

});

describe('tryGetRaiPrettyError', () => {

    it('should return prettified error message when inner error is filtered as jailbreak', () => {
        const errorMessage = "Some error occurred, 'innererror': {'content_filter_result': {'jailbreak': {'filtered': True}}}}}";

        // Fix the input format: Single quotes must be properly escaped in the context of JSON parsing
        const result = tryGetRaiPrettyError(errorMessage);

        expect(result).toEqual(
            'The prompt was filtered due to triggering Azure OpenAI’s content filtering system.\n' +
            'Reason: This prompt contains content flagged as Jailbreak\n\n' +
            'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
        );
    });

    it('should return the original error message if no inner error found', () => {
        const errorMessage = "Error: some error message without inner error";
        const result = tryGetRaiPrettyError(errorMessage);

        expect(result).toEqual(errorMessage);
    });

    it('should return the original error message if inner error is malformed', () => {
        const errorMessage = "Error: some error message, 'innererror': {'content_filter_result': {'jailbreak': {'filtered': true}}}";
        const result = tryGetRaiPrettyError(errorMessage);

        expect(result).toEqual(errorMessage);
    });

});

describe('parseErrorMessage', () => {

    it('should extract inner error message and call tryGetRaiPrettyError', () => {
        const errorMessage = "Error occurred - {\\'error\\': {\\'message\\': 'Some inner error message'}}";
        const result = parseErrorMessage(errorMessage);

        expect(result).toEqual("Error occurred - {'error': {'message': 'Some inner error message");
    });
    
});


