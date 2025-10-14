import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './Cards.module.css';
import { User } from '../../types/User';
import {
  PlannerItem,
  fetchPlannerItems,
  createPlannerItem,
  updatePlannerItem,
  deletePlannerItem,
} from '../../api/reminders';
import { fetchCalendarEvents, CalendarEvent } from '../../api/calendar';

interface CardsProps {
  onCardClick?: (user: User) => void;
}

interface HealthLog {
  id: string;
  event: string;
  note: string;
  recordedAt: string;
}

interface HealthInfoState {
  status: 'idle' | 'loading' | 'error' | 'success';
  headline: string;
  summary: string;
  sourceUrl?: string;
  updatedAt?: string;
  errorMessage?: string;
}

const formatCalendarRange = (event: CalendarEvent): string => {
  const startISO = event.start?.dateTime;
  const endISO = event.end?.dateTime;
  const locale = 'en-US';
  const timeZone = event.start?.timeZone || event.end?.timeZone;

  if (event.isAllDay && startISO) {
    const startDate = new Date(startISO);
    return `${startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone })} · All day`;
  }

  if (startISO && endISO) {
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    const sameDay = startDate.toDateString() === endDate.toDateString();

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      timeZone,
    });

    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });

    if (sameDay) {
      return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
    }

    return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} → ${dateFormatter.format(endDate)} ${timeFormatter.format(endDate)}`;
  }

  if (startISO) {
    const startDate = new Date(startISO);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(startDate);
  }

  return 'Time not available';
};

const Cards: React.FC<CardsProps> = () => {
  const [reminders, setReminders] = useState<PlannerItem[]>([]);
  const [todos, setTodos] = useState<PlannerItem[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([
    {
      id: 'health-1',
      event: 'Medication given',
      note: 'Hydroxyurea, 250mg',
      recordedAt: new Date().toISOString(),
    },
  ]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [nextMedicationTime, setNextMedicationTime] = useState<Date>(() => {
    const initial = new Date();
    initial.setHours(20, 0, 0, 0);
    if (initial < new Date()) {
      initial.setDate(initial.getDate() + 1);
    }
    return initial;
  });
  const [medicationCountdown, setMedicationCountdown] = useState<string>('');
  const [newReminderLabel, setNewReminderLabel] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newTodoLabel, setNewTodoLabel] = useState('');
  const [newHealthNote, setNewHealthNote] = useState('');
  const [newHealthEvent, setNewHealthEvent] = useState('Medication given');
  const [healthTopic, setHealthTopic] = useState('sickle cell crisis management for children');
  const [healthInfo, setHealthInfo] = useState<HealthInfoState>({
    status: 'idle',
    headline: 'Health insights',
    summary: 'Search for Mukarram’s health updates to stay informed.',
  });

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Mira!';
    if (hour < 18) return 'Good afternoon, Mira!';
    return 'Good evening, Mira!';
  }, []);

  const handleAddReminder = () => {
    if (!newReminderLabel.trim()) {
      return;
    }
    const label = newReminderLabel.trim();
    const time = newReminderTime || 'Anytime';

    createPlannerItem('reminder', { label, time })
      .then(created => {
        setReminders((prev: PlannerItem[]) => [...prev, created]);
        setNewReminderLabel('');
        setNewReminderTime('');
      })
      .catch(error => console.error('Failed to add reminder', error));
  };

  const handleToggleReminder = (id: string) => {
    const target = reminders.find((item: PlannerItem) => item.id === id);
    if (!target) {
      return;
    }

    const updatedCompleted = !target.completed;
    setReminders((prev: PlannerItem[]) =>
      prev.map((item: PlannerItem) => (item.id === id ? { ...item, completed: updatedCompleted } : item)),
    );
    updatePlannerItem('reminder', id, { completed: updatedCompleted }).catch(error => {
      console.error('Failed to update reminder completion', error);
      setReminders((prev: PlannerItem[]) =>
        prev.map((item: PlannerItem) => (item.id === id ? { ...item, completed: !updatedCompleted } : item)),
      );
    });
  };

  const handleReminderLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewReminderLabel(event.target.value);
  };

  const handleReminderTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewReminderTime(event.target.value);
  };

  const handleAddTodo = () => {
    if (!newTodoLabel.trim()) {
      return;
    }
    const label = newTodoLabel.trim();
    createPlannerItem('todo', { label })
      .then(created => {
        setTodos((prev: PlannerItem[]) => [...prev, created]);
        setNewTodoLabel('');
      })
      .catch(error => console.error('Failed to add to-do', error));
  };

  const handleToggleTodo = (id: string) => {
    const target = todos.find((item: PlannerItem) => item.id === id);
    if (!target) {
      return;
    }

    const updatedCompleted = !target.completed;
    setTodos((prev: PlannerItem[]) =>
      prev.map((item: PlannerItem) => (item.id === id ? { ...item, completed: updatedCompleted } : item)),
    );
    updatePlannerItem('todo', id, { completed: updatedCompleted }).catch(error => {
      console.error('Failed to update to-do completion', error);
      setTodos((prev: PlannerItem[]) =>
        prev.map((item: PlannerItem) => (item.id === id ? { ...item, completed: !updatedCompleted } : item)),
      );
    });
  };

  const handleTodoLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoLabel(event.target.value);
  };

  const handleAddHealthLog = () => {
    if (!newHealthNote.trim()) {
      return;
    }
    const id = `health-${Date.now()}`;
    setHealthLogs((prev: HealthLog[]) => [
      {
        id,
        event: newHealthEvent,
        note: newHealthNote.trim(),
        recordedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewHealthNote('');
  };

  const handleHealthEventChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setNewHealthEvent(event.target.value);
  };

  const handleHealthNoteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewHealthNote(event.target.value);
  };

  const handleHealthTopicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHealthTopic(event.target.value);
  };

  const scheduleMedication = (minutesFromNow: number) => {
    const next = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setNextMedicationTime(next);
  };

  useEffect(() => {
    const loadPlanner = async () => {
      try {
        const [serverReminders, serverTodos] = await Promise.all([
          fetchPlannerItems('reminder'),
          fetchPlannerItems('todo'),
        ]);
        setReminders(serverReminders);
        setTodos(serverTodos);
      } catch (error) {
        console.error('Failed to load planner items', error);
      }
    };

    loadPlanner();
  }, []);

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const events = await fetchCalendarEvents({ days: 3, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        setCalendarEvents(events);
      } catch (error) {
        console.error('Failed to load calendar events', error);
      }
    };

    loadCalendar();
  }, []);

  // Keep a live countdown to make medication timers obvious on the dashboard.
  useEffect(() => {
    const updateCountdown = () => {
      const diff = nextMedicationTime.getTime() - Date.now();
      if (diff <= 0) {
        setMedicationCountdown('Due now');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setMedicationCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [nextMedicationTime]);

  // Fetch public health guidance via DuckDuckGo so the content stays fresh without API keys.
  const fetchHealthInfo = useCallback(
    async (topic: string) => {
      try {
        setHealthInfo({
          status: 'loading',
          headline: `Health insights: ${topic}`,
          summary: 'Fetching live guidance...',
        });

        const response = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_redirect=1&no_html=1`,
        );

        if (!response.ok) {
          throw new Error(`Unable to load information (status ${response.status})`);
        }

        const data: any = await response.json();
        const headline = data.Heading || `Health insights: ${topic}`;
        let summary: string = data.AbstractText || '';
        let sourceUrl: string | undefined = data.AbstractURL || undefined;

        if (!summary && Array.isArray(data.RelatedTopics)) {
          const firstTopic = data.RelatedTopics.find((item: any) => typeof item.Text === 'string');
          if (firstTopic) {
            summary = firstTopic.Text;
            sourceUrl = firstTopic.FirstURL || sourceUrl;
          }
        }

        if (!summary) {
          summary = 'No current summary from the live source. Try a different topic.';
        }

        setHealthInfo({
          status: 'success',
          headline,
          summary,
          sourceUrl,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        setHealthInfo({
          status: 'error',
          headline: `Health insights: ${topic}`,
          summary: 'Unable to load live data right now.',
          errorMessage: message,
        });
      }
    },
    [],
  );

  useEffect(() => {
    fetchHealthInfo(healthTopic);
  }, [healthTopic, fetchHealthInfo]);

  const formatHealthLogTime = (isoString: string) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoString));

  return (
    <div className={styles.cardContainer}>
      <section className={styles.panel}>
        <article className={styles.summaryCard}>
          <div>
            <p className={styles.greeting}>{greeting}</p>
            <p className={styles.date}>{formattedDate}</p>
          </div>
          <div className={styles.quickActions}>
            <button type="button" className={styles.quickActionBtn} onClick={() => scheduleMedication(15)}>
              Take 15 min breather
            </button>
            <button type="button" className={styles.quickActionBtn} onClick={() => scheduleMedication(120)}>
              Next medication +2h
            </button>
            <button type="button" className={styles.quickActionBtn} onClick={() => setHealthTopic('hydration tips for kids')}>
              Hydration tips
            </button>
          </div>
        </article>

        <article className={styles.cardSection}>
          <header className={styles.sectionHeader}>Upcoming reminders</header>
          <div className={styles.inlineForm}>
            <input
              type="text"
              value={newReminderLabel}
              onChange={handleReminderLabelChange}
              placeholder="Add a reminder"
            />
            <input
              type="time"
              value={newReminderTime}
              onChange={handleReminderTimeChange}
            />
            <button type="button" onClick={handleAddReminder} className={styles.primaryButton}>
              Add
            </button>
          </div>
          <ul className={styles.list}>
            {reminders.map((reminder: PlannerItem) => (
              <li key={reminder.id} className={styles.listItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={reminder.completed}
                    onChange={() => handleToggleReminder(reminder.id)}
                  />
                  <span className={reminder.completed ? styles.completedText : ''}>{reminder.label}</span>
                </label>
                <span className={styles.itemMeta}>{reminder.time || 'Anytime'}</span>
              </li>
            ))}
            {reminders.length === 0 && <li className={styles.emptyState}>No reminders yet. Add one to get started.</li>}
          </ul>
        </article>

        <article className={styles.cardSection}>
          <header className={styles.sectionHeader}>Personal to-dos</header>
          <div className={styles.inlineForm}>
            <input type="text" value={newTodoLabel} onChange={handleTodoLabelChange} placeholder="Track a task" />
            <button type="button" onClick={handleAddTodo} className={styles.primaryButton}>
              Add
            </button>
          </div>
          <ul className={styles.list}>
            {todos.map((todo: PlannerItem) => (
              <li key={todo.id} className={styles.listItem}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={todo.completed} onChange={() => handleToggleTodo(todo.id)} />
                  <span className={todo.completed ? styles.completedText : ''}>{todo.label}</span>
                </label>
              </li>
            ))}
            {todos.length === 0 && <li className={styles.emptyState}>You are all caught up. Add the next idea.</li>}
          </ul>
        </article>

        <article className={styles.cardSection}>
          <header className={styles.sectionHeader}>Mukarram’s schedule & health</header>
          <div className={styles.calendarScroller}>
            {calendarEvents.length === 0 ? (
              <p className={styles.emptyState}>No upcoming events in the next few days.</p>
            ) : (
              <ul className={styles.calendarList}>
                {calendarEvents.map(event => (
                  <li key={event.id} className={styles.calendarItem}>
                    <p className={styles.calendarTitle}>{event.subject || 'Untitled event'}</p>
                    <p className={styles.calendarTime}>{formatCalendarRange(event)}</p>
                    {event.location && <p className={styles.calendarLocation}>{event.location}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.medicationTimer}>
            <div>
              <p className={styles.timerLabel}>Next medication countdown</p>
              <p className={styles.timerValue}>{medicationCountdown}</p>
            </div>
            <div className={styles.timerActions}>
              <button type="button" onClick={() => scheduleMedication(30)} className={styles.secondaryButton}>
                Snooze 30 min
              </button>
              <button type="button" onClick={() => scheduleMedication(240)} className={styles.secondaryButton}>
                Push 4 hours
              </button>
            </div>
          </div>
          <div className={styles.inlineForm}>
            <select value={newHealthEvent} onChange={handleHealthEventChange}>
              <option>Medication given</option>
              <option>Pain episode</option>
              <option>Doctor contacted</option>
              <option>Sleep quality</option>
              <option>Hydration check</option>
            </select>
            <input
              type="text"
              value={newHealthNote}
              onChange={handleHealthNoteChange}
              placeholder="Add a health note"
            />
            <button type="button" onClick={handleAddHealthLog} className={styles.primaryButton}>
              Log
            </button>
          </div>
          <ul className={styles.list}>
            {healthLogs.map((log: HealthLog) => (
              <li key={log.id} className={styles.listItem}>
                <div className={styles.healthLogRow}>
                  <span className={styles.healthLogEvent}>{log.event}</span>
                  <span className={styles.itemMeta}>{formatHealthLogTime(log.recordedAt)}</span>
                </div>
                <p className={styles.healthLogNote}>{log.note}</p>
              </li>
            ))}
            {healthLogs.length === 0 && <li className={styles.emptyState}>No health notes yet. Log the latest update.</li>}
          </ul>
          <div className={styles.healthInfoSection}>
            <div className={styles.healthInfoHeader}>
              <h4>{healthInfo.headline}</h4>
              <div className={styles.healthInfoControls}>
                <input type="text" value={healthTopic} onChange={handleHealthTopicChange} placeholder="Search health advice" />
                <button type="button" className={styles.secondaryButton} onClick={() => fetchHealthInfo(healthTopic)}>
                  Refresh
                </button>
              </div>
            </div>
            <p className={styles.healthInfoSummary}>{healthInfo.summary}</p>
            {healthInfo.sourceUrl && (
              <a href={healthInfo.sourceUrl} target="_blank" rel="noreferrer" className={styles.healthInfoLink}>
                View full source
              </a>
            )}
            {healthInfo.updatedAt && (
              <p className={styles.healthInfoMeta}>
                Updated {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(healthInfo.updatedAt))}
              </p>
            )}
            {healthInfo.status === 'error' && (
              <p className={styles.errorText}>{healthInfo.errorMessage}</p>
            )}
            <p className={styles.disclaimer}>This assistant provides reminders and live links but does not replace medical guidance.</p>
          </div>
        </article>

        <article className={styles.cardSection}>
          <header className={styles.sectionHeader}>Notes this week</header>
          <p className={styles.notesSummary}>
            Mira keeps your most recent notes handy. Pair them with reminders to stay ahead of the day.
          </p>
          <ul className={styles.list}>
            {healthLogs.slice(0, 3).map(log => (
              <li key={`note-${log.id}`} className={styles.listItem}>
                <span className={styles.healthLogEvent}>{log.event}</span>
                <p className={styles.healthLogNote}>{log.note}</p>
              </li>
            ))}
            {healthLogs.length === 0 && <li className={styles.emptyState}>Your notes will appear here once you add them.</li>}
          </ul>
        </article>
      </section>
    </div>
  );
};

export default Cards;
