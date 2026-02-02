import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import InboxSheet from './components/InboxSheet'
import LinkedNotesSheet from './components/LinkedNotesSheet'
import LinkNoteModal from './components/LinkNoteModal'
import MonthCalendarModal from './components/MonthCalendarModal'
import NoteModal from './components/NoteModal'
import QuickCaptureInput from './components/QuickCaptureInput'
import SettingsModal from './components/SettingsModal'
import TaskSheet from './components/TaskSheet'
import TopBar from './components/TopBar'
import WeekStrip from './components/WeekStrip'
import TaskList from './components/TaskList'
import NotesView from './views/NotesView'
import FeedbackView from './views/FeedbackView'
import PlanningView from './views/PlanningView'
import { useAppStore } from './store/useAppStore'
import type { Note } from './types/note'
import type { Task } from './types/task'
import { pullChanges, pushChanges, startSync } from './sync/syncManager'
import { parseCaptureInput } from './utils/captureParser'

const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const formatLocalDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDayKeyToDate = (dayKey: string) => {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

const parseTimeToMinutes = (value: string) => {
  if (!value) {
    return null
  }
  const [hours, minutes] = value.split(':').map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  return hours * 60 + minutes
}

const getStatusForTimeRange = (timeStart: string, timeEnd: string) => {
  if (!timeStart || !timeEnd) {
    return 'planned' as Task['status']
  }
  const startMinutes = parseTimeToMinutes(timeStart)
  const endMinutes = parseTimeToMinutes(timeEnd)
  if (startMinutes === null || endMinutes === null) {
    return 'planned' as Task['status']
  }
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  if (nowMinutes > endMinutes) {
    return 'overdue' as Task['status']
  }
  if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
    return 'active' as Task['status']
  }
  return 'planned' as Task['status']
}

const shiftDayKey = (dayKey: string, daysToAdd: number) => {
  const date = parseDayKeyToDate(dayKey)
  date.setDate(date.getDate() + daysToAdd)
  return formatLocalDayKey(date)
}

const isSameOrAfter = (startKey: string, targetKey: string) => {
  const start = parseDayKeyToDate(startKey)
  const target = parseDayKeyToDate(targetKey)
  start.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() >= start.getTime()
}

const buildWeekDays = (baseDate: Date) => {
  const todayKey = formatLocalDayKey(new Date())
  const dayIndex = (baseDate.getDay() + 6) % 7
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - dayIndex)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: formatLocalDayKey(date),
      label: dayNames[index],
      number: date.getDate(),
    }
  })

  return { todayKey, days, start, end }
}

const formatWeekRange = (start: Date, end: Date) => {
  const startMonth = monthShortNames[start.getMonth()]
  const endMonth = monthShortNames[end.getMonth()]
  if (start.getMonth() === end.getMonth()) {
    return `Semana ${start.getDate()}-${end.getDate()} ${startMonth}`
  }
  return `Semana ${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`
}

const formatMinutes = (totalMinutes: number) => {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '0m'
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  return `${minutes}m`
}

function App() {
  const {
    tasks,
    inboxItems,
    notes,
    selectedDayKey,
    wakeTime,
    sleepTime,
    applyRoutineAllDays,
    warnOverbooked,
    blockOverbooked,
    isReady,
    init,
    addInboxItem,
    deleteInboxItem,
    updateInboxItem,
    createNote,
    updateNote,
    createTask,
    convertInboxToNote,
    linkNoteToTask,
    runTimeTick,
    convertInboxToTask,
    updateTask,
    toggleTaskDone,
    startTimer,
    stopTimer,
    deleteTask,
    setSelectedDayKey,
    updateRoutine,
    isOverbookedForDay,
    getDailyCapacityMinutes,
    getPlannedDurationMinutesForDay,
  } = useAppStore()
  const baseDate = useMemo(() => parseDayKeyToDate(selectedDayKey), [selectedDayKey])
  const { todayKey, days, start, end } = useMemo(() => buildWeekDays(baseDate), [baseDate])
  const weekLabel = useMemo(() => formatWeekRange(start, end), [start, end])
  const [activeTab, setActiveTab] = useState<'today' | 'notes' | 'planning' | 'feedback'>('today')
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isLinkedNotesOpen, setIsLinkedNotesOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [draftNote, setDraftNote] = useState<Note | null>(null)
  const [linkTargetTaskId, setLinkTargetTaskId] = useState<string | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkNoteId, setLinkNoteId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const autoSyncTimeoutRef = useRef<number | null>(null)
  const syncInFlightRef = useRef(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [rolloverDismissed, setRolloverDismissed] = useState(false)
  const [quickCapture, setQuickCapture] = useState('')
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)

  const todayKeyActual = formatLocalDayKey(new Date())
  const baseTasks = useMemo(() => tasks.filter((task) => !task.recurrenceParentId), [tasks])
  const baseTaskIds = useMemo(() => new Set(baseTasks.map((task) => task.id)), [baseTasks])
  const recurringInstances = useMemo(
    () => tasks.filter((task) => task.recurrenceParentId && task.dayKey === selectedDayKey),
    [tasks, selectedDayKey],
  )
  const instanceByParent = useMemo(() => {
    const map = new Map<string, Task>()
    recurringInstances.forEach((instance) => {
      if (instance.recurrenceParentId) {
        map.set(instance.recurrenceParentId, instance)
      }
    })
    return map
  }, [recurringInstances])
  const orphanInstances = useMemo(
    () => recurringInstances.filter((instance) => !baseTaskIds.has(instance.recurrenceParentId ?? '')),
    [recurringInstances, baseTaskIds],
  )

  const visibleTasks = [
    ...baseTasks
      .filter((task) => {
        if (task.recurrence === 'none') {
          return task.dayKey === selectedDayKey
        }
        if (!isSameOrAfter(task.dayKey, selectedDayKey)) {
          return false
        }
        const selectedDate = parseDayKeyToDate(selectedDayKey)
        const taskDate = parseDayKeyToDate(task.dayKey)
        if (task.recurrence === 'daily') {
          return true
        }
        if (task.recurrence === 'weekly') {
          return taskDate.getDay() === selectedDate.getDay()
        }
        if (task.recurrence === 'monthly') {
          return taskDate.getDate() === selectedDate.getDate()
        }
        return false
      })
      .map((task) => {
        if (task.recurrence !== 'none') {
          const instance = instanceByParent.get(task.id)
          if (instance) {
            return instance
          }
        }
        if (task.status === 'done' && task.recurrence === 'none') {
          return task
        }
        if (task.recurrence === 'none' || task.dayKey === selectedDayKey) {
          return task
        }
        if (selectedDayKey !== todayKeyActual) {
          return { ...task, status: 'planned' as Task['status'] }
        }
        return { ...task, status: getStatusForTimeRange(task.timeStart, task.timeEnd) }
      }),
    ...orphanInstances,
  ]
  const taskCounts = useMemo(
    () =>
      visibleTasks.reduce(
        (acc, task) => {
          if (task.status === 'overdue') {
            acc.overdue += 1
          } else if (task.status === 'done') {
            acc.done += 1
          } else if (task.status === 'active') {
            acc.active += 1
          } else {
            acc.planned += 1
          }
          return acc
        },
        { planned: 0, active: 0, overdue: 0, done: 0 },
      ),
    [visibleTasks],
  )
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null
  const rolloverCandidates = useMemo(() => {
    const todayDate = parseDayKeyToDate(todayKeyActual)
    return tasks.filter((task) => {
      if (task.recurrence !== 'none' && !task.recurrenceParentId) {
        return false
      }
      if (task.status === 'done') {
        return false
      }
      const taskDate = parseDayKeyToDate(task.dayKey)
      return taskDate < todayDate
    })
  }, [tasks, todayKeyActual])

  const capacityMinutes = useMemo(() => getDailyCapacityMinutes(), [getDailyCapacityMinutes])
  const plannedMinutes = useMemo(
    () => getPlannedDurationMinutesForDay(selectedDayKey),
    [getPlannedDurationMinutesForDay, selectedDayKey],
  )
  const focusMinutes = useMemo(() => {
    const totalMs = tasks.reduce((total, task) => {
      if (task.dayKey !== selectedDayKey) {
        return total
      }
      const base = Number.isFinite(task.timeSpent) ? task.timeSpent : 0
      const running =
        task.isTimerRunning && typeof task.lastTimerStart === 'number' ? Date.now() - task.lastTimerStart : 0
      return total + base + Math.max(0, running)
    }, 0)
    return Math.round(totalMs / 60000)
  }, [tasks, selectedDayKey])
  const capacityRatio = capacityMinutes > 0 ? Math.min(plannedMinutes / capacityMinutes, 1) : 0
  const remainingMinutes = Math.max(capacityMinutes - plannedMinutes, 0)
  const heroDateLabel = useMemo(() => {
    const date = parseDayKeyToDate(selectedDayKey)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
  }, [selectedDayKey])

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!isReady) {
      return
    }
    return startSync()
  }, [isReady, startSync])

  const runSync = useCallback(async (mode: 'auto' | 'manual') => {
    if (syncInFlightRef.current || !navigator.onLine) {
      if (mode === 'manual' && !navigator.onLine) {
        setToast({ type: 'error', message: 'Sem conexão com a internet.' })
      }
      return
    }
    syncInFlightRef.current = true
    if (mode === 'manual') {
      setIsSyncing(true)
    }
    try {
      await pushChanges()
      await pullChanges()
      if (mode === 'manual') {
      setToast({ type: 'success', message: 'Sincronização concluída.' })
      }
    } catch (error) {
      if (mode === 'manual') {
        const message =
          error instanceof Error && error.message
            ? `Erro de sincronização: ${error.message}`
            : 'Falha ao sincronizar.'
        setToast({ type: 'error', message })
      }
    } finally {
      syncInFlightRef.current = false
      if (mode === 'manual') {
        setIsSyncing(false)
      }
    }
  }, [setIsSyncing, setToast])

  useEffect(() => {
    if (!isReady) {
      return
    }
    const scheduleAutoSync = () => {
      if (autoSyncTimeoutRef.current !== null) {
        window.clearTimeout(autoSyncTimeoutRef.current)
      }
      autoSyncTimeoutRef.current = window.setTimeout(async () => {
        autoSyncTimeoutRef.current = null
        await runSync('auto')
      }, 1200)
    }

    window.addEventListener('sync-queue-updated', scheduleAutoSync)
    return () => {
      window.removeEventListener('sync-queue-updated', scheduleAutoSync)
      if (autoSyncTimeoutRef.current !== null) {
        window.clearTimeout(autoSyncTimeoutRef.current)
        autoSyncTimeoutRef.current = null
      }
    }
  }, [isReady, runSync])

  useEffect(() => {
    if (!isReady) {
      return
    }
    const interval = window.setInterval(() => {
      runTimeTick()
    }, 60_000)
    runTimeTick()
    return () => window.clearInterval(interval)
  }, [isReady, runTimeTick])

  useEffect(() => {
    if (rolloverCandidates.length === 0 && rolloverDismissed) {
      setRolloverDismissed(false)
    }
  }, [rolloverCandidates.length, rolloverDismissed])

  useEffect(() => {
    if (!pendingNoteId) {
      return
    }
    const note = notes.find((item) => item.id === pendingNoteId) ?? null
    if (!note) {
      return
    }
    setIsInboxOpen(false)
    setIsTaskSheetOpen(false)
    setIsLinkedNotesOpen(false)
    setIsCalendarOpen(false)
    setIsSettingsOpen(false)
    setIsLinkModalOpen(false)
    setActiveTab('today')
    setActiveNote(note)
    setDraftNote(null)
    setIsNoteModalOpen(true)
    setPendingNoteId(null)
  }, [pendingNoteId, notes])

  const closeAllOverlays = () => {
    setIsInboxOpen(false)
    setIsTaskSheetOpen(false)
    setIsLinkedNotesOpen(false)
    setIsCalendarOpen(false)
    setIsSettingsOpen(false)
    setIsNoteModalOpen(false)
    setIsLinkModalOpen(false)
    setActiveNote(null)
    setDraftNote(null)
    setLinkTargetTaskId(null)
    setLinkNoteId(null)
  }

  const resetNoteModalState = () => {
    setActiveNote(null)
    setDraftNote(null)
    setLinkTargetTaskId(null)
  }

  const handleSelectTab = (tab: 'today' | 'notes' | 'planning' | 'feedback') => {
    closeAllOverlays()
    setActiveTab(tab)
  }

  const handleOpenNotes = () => {
    closeAllOverlays()
    setActiveTab('notes')
  }

  const handleOpenInbox = () => {
    closeAllOverlays()
    setActiveTab('today')
    setIsInboxOpen(true)
  }

  const handleCloseInbox = () => {
    closeAllOverlays()
    setActiveTab('today')
  }

  const handleConvertToTask = (id: string) => {
    const taskId = convertInboxToTask(id, selectedDayKey)
    handleCloseInbox()
    if (taskId) {
      setActiveTaskId(taskId)
      setIsTaskSheetOpen(true)
    }
  }

  const handleConvertToNote = (id: string) => {
    const item = inboxItems.find((inbox) => inbox.id === id)
    if (!item) {
      return
    }
    const noteId = convertInboxToNote(id, { title: '', body: item.text })
    handleCloseInbox()
    if (noteId) {
      setPendingNoteId(noteId)
    }
  }

  const handleOpenNote = (note: Note) => {
    closeAllOverlays()
    setActiveTab('today')
    setActiveNote(note)
    setDraftNote(null)
    setLinkTargetTaskId(null)
    setIsNoteModalOpen(true)
  }

  const handleLinkNewNote = () => {
    if (!activeTask) {
      return
    }
    closeAllOverlays()
    setActiveTab('today')
    setActiveNote(null)
    setDraftNote({
      id: `draft-task-${activeTask.id}`,
      title: '',
      body: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setLinkTargetTaskId(activeTask.id)
    setIsNoteModalOpen(true)
  }

  const handleAddTask = () => {
    closeAllOverlays()
    setActiveTab('today')
    const taskId = createTask(selectedDayKey)
    setActiveTaskId(taskId)
    setIsTaskSheetOpen(true)
  }

  const handleSelectTask = (task: Task) => {
    closeAllOverlays()
    setActiveTaskId(task.id)
    setIsTaskSheetOpen(true)
  }

  const handleCloseTaskSheet = () => {
    setIsTaskSheetOpen(false)
  }

  const handleOpenCalendar = () => {
    closeAllOverlays()
    setCalendarMonth(parseDayKeyToDate(selectedDayKey))
    setIsCalendarOpen(true)
  }

  const handleSelectCalendarDay = (date: Date) => {
    setIsCalendarOpen(false)
    setSelectedDayKey(formatLocalDayKey(date))
  }

  const handleOpenSettings = () => {
    closeAllOverlays()
    setIsSettingsOpen(true)
  }

  const handleRolloverApply = () => {
    if (rolloverCandidates.length === 0) {
      return
    }
    rolloverCandidates.forEach((task) => {
      updateTask(task.id, { dayKey: todayKeyActual, status: 'planned' })
    })
    setRolloverDismissed(true)
  }

  const handleRolloverDismiss = () => {
    setRolloverDismissed(true)
  }

  const handleRolloverReview = () => {
    setRolloverDismissed(false)
  }

  const handleForceSync = async () => {
    if (isSyncing) {
      return
    }
    await runSync('manual')
  }

  useEffect(() => {
    if (!toast) {
      return
    }
    const handle = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(handle)
  }, [toast])

  const handleOpenLinkedNotes = () => {
    setIsTaskSheetOpen(false)
    setIsLinkedNotesOpen(true)
  }

  const handleCloseLinkedNotes = () => {
    setIsLinkedNotesOpen(false)
  }

  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false)
    resetNoteModalState()
  }

  const handleSaveNote = (data: { title: string; body: string; color?: string }) => {
    if (activeNote) {
      updateNote(activeNote.id, data)
      handleCloseNoteModal()
      return
    }
    const createdId = createNote(data)
    if (linkTargetTaskId) {
      linkNoteToTask(createdId, linkTargetTaskId)
    }
    handleCloseNoteModal()
  }

  const handleLinkFromNote = (data: { title: string; body: string; color?: string }) => {
    let noteId = activeNote?.id ?? null
    if (activeNote) {
      updateNote(activeNote.id, data)
    }
    if (!noteId && !activeNote) {
      noteId = createNote(data)
    }
    if (noteId && linkTargetTaskId) {
      linkNoteToTask(noteId, linkTargetTaskId)
    }
    if (noteId) {
      setLinkNoteId(noteId)
      setIsLinkModalOpen(true)
      setIsNoteModalOpen(false)
      resetNoteModalState()
    }
  }

  const handleCloseLinkModal = () => {
    setIsLinkModalOpen(false)
    setLinkNoteId(null)
  }

  const overbookedKeys = useMemo(() => {
    return new Set(days.filter((day) => isOverbookedForDay(day.key)).map((day) => day.key))
  }, [days, isOverbookedForDay])

  const hasOverlayOpen =
    isInboxOpen ||
    isTaskSheetOpen ||
    isLinkedNotesOpen ||
    isCalendarOpen ||
    isSettingsOpen ||
    isNoteModalOpen ||
    isLinkModalOpen
  const showFab = activeTab === 'today' && !hasOverlayOpen
  const showRolloverBanner = rolloverCandidates.length > 0 && !rolloverDismissed

  const handleQuickCaptureSubmit = (value?: string) => {
    const text = (value ?? quickCapture).trim()
    if (!text) {
      return
    }
    const parsed = parseCaptureInput(text)
    if (parsed.kind === 'note') {
      createNote({ title: '', body: parsed.title })
      setQuickCapture('')
      setToast({ type: 'success', message: 'Nota salva.' })
      return
    }
    if (parsed.kind === 'task') {
      const taskDayKey = parsed.dayKey ?? selectedDayKey
      const taskId = createTask(taskDayKey)
      updateTask(taskId, {
        title: parsed.title,
        timeStart: parsed.timeStart ?? '',
        timeEnd: parsed.timeEnd ?? '',
      })
      setQuickCapture('')
      setToast({ type: 'success', message: 'Tarefa criada.' })
      return
    }
    addInboxItem(text)
    setQuickCapture('')
    setToast({ type: 'success', message: 'Adicionado na inbox.' })
  }

  if (!isReady) {
    return (
      <div className="app-shell app-shell--loading">
        <div className="loading-panel" role="status" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Carregando...</span>
          <div className="loading-bar is-medium" />
          <div className="loading-bar" />
          <div className="loading-bar is-short" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {toast && (
        <div className={`toast toast--${toast.type}`} role="status" aria-live="polite" aria-atomic="true">
          {toast.message}
        </div>
      )}
      {activeTab === 'notes' ? (
        <NotesView />
      ) : activeTab === 'planning' ? (
        <PlanningView />
      ) : activeTab === 'feedback' ? (
        <FeedbackView />
      ) : (
        <>
          <TopBar
            title={weekLabel}
            onCalendarClick={handleOpenCalendar}
            onNotesClick={handleOpenNotes}
            onInboxClick={handleOpenInbox}
            onSettingsClick={handleOpenSettings}
          />
          <main className="app-content">
            <div className="home-stack">
              <div className="home-header">
                <div>
                  <h1 className="page-title">Hoje / Semana</h1>
                </div>
                <div className="home-header__actions">
                  <button type="button" className="home-primary-action" onClick={handleAddTask}>
                    Nova tarefa
                  </button>
                  {rolloverCandidates.length > 0 && (
                    <button type="button" className="rollover-button" onClick={handleRolloverReview}>
                      Revisar atrasadas ({rolloverCandidates.length})
                    </button>
                  )}
                </div>
              </div>
              {showRolloverBanner && (
                <div className="rollover-banner" role="status" aria-live="polite">
                  <div className="rollover-banner__text">
                    Você tem {rolloverCandidates.length} tarefa(s) pendente(s) de dias anteriores.
                  </div>
                  <div className="rollover-banner__actions">
                    <button type="button" className="rollover-banner__primary" onClick={handleRolloverApply}>
                      Trazer para hoje
                    </button>
                    <button type="button" className="rollover-banner__ghost" onClick={handleRolloverDismiss}>
                      Ignorar
                    </button>
                  </div>
                </div>
              )}
              <div className="home-layout">
                <section className="home-main">
                  <div className="home-panel">
                    <div className="home-panel__header">
                      <div>
                        <h2 className="home-panel__title">Agenda do dia</h2>
                      </div>
                    </div>
                    <div className="home-panel__body">
                      <WeekStrip
                        days={days}
                        selectedKey={selectedDayKey}
                        todayKey={todayKey}
                        overbookedKeys={overbookedKeys}
                        onSelect={setSelectedDayKey}
                        onPrevWeek={() => setSelectedDayKey(shiftDayKey(selectedDayKey, -7))}
                        onNextWeek={() => setSelectedDayKey(shiftDayKey(selectedDayKey, 7))}
                      />
                      <TaskList
                        tasks={visibleTasks}
                        onSelectTask={handleSelectTask}
                        onToggleDone={toggleTaskDone}
                        onStartTimer={startTimer}
                        onStopTimer={stopTimer}
                        onAddTask={handleAddTask}
                      />
                    </div>
                  </div>
                </section>
                <aside className="home-side">
                  <section className="home-hero" aria-label="Resumo do dia">
                    <div className="home-hero__top">
                      <div>
                        <div className="home-hero__title">Resumo do dia</div>
                        <div className="home-hero__date">{heroDateLabel}</div>
                      </div>
                      <div className={`hero-progress__badge${plannedMinutes > capacityMinutes ? ' is-over' : ''}`}>
                        {capacityMinutes > 0
                          ? plannedMinutes > capacityMinutes
                            ? 'Acima da capacidade'
                            : `${formatMinutes(remainingMinutes)} livres`
                          : 'Defina sua rotina'}
                      </div>
                    </div>
                    <div className="home-hero__stats">
                      <div className="hero-stat">
                        <span className="hero-stat__label">Planejadas</span>
                        <span className="hero-stat__value">{taskCounts.planned}</span>
                      </div>
                      <div className="hero-stat">
                        <span className="hero-stat__label">Ativas</span>
                        <span className="hero-stat__value hero-stat__value--accent">{taskCounts.active}</span>
                      </div>
                      <div className="hero-stat">
                        <span className="hero-stat__label">Atrasadas</span>
                        <span className="hero-stat__value hero-stat__value--danger">{taskCounts.overdue}</span>
                      </div>
                      <div className="hero-stat">
                        <span className="hero-stat__label">Concluídas</span>
                        <span className="hero-stat__value hero-stat__value--success">{taskCounts.done}</span>
                      </div>
                      <div className="hero-stat">
                        <span className="hero-stat__label">Foco</span>
                        <span className="hero-stat__value">{formatMinutes(focusMinutes)}</span>
                      </div>
                    </div>
                    <div className="hero-progress">
                      <div className="hero-progress__meta">
                        <span>Capacidade do dia</span>
                        <span>
                          {capacityMinutes > 0
                            ? `${formatMinutes(plannedMinutes)} de ${formatMinutes(capacityMinutes)}`
                            : 'Sem rotina'}
                        </span>
                      </div>
                      <div
                        className="hero-progress__bar"
                        role="progressbar"
                        aria-label="Capacidade do dia"
                        aria-valuemin={0}
                        aria-valuemax={capacityMinutes || 1}
                        aria-valuenow={capacityMinutes > 0 ? Math.min(plannedMinutes, capacityMinutes) : 0}
                        aria-valuetext={
                          capacityMinutes > 0
                            ? `${formatMinutes(plannedMinutes)} de ${formatMinutes(capacityMinutes)}`
                            : 'Sem rotina'
                        }
                      >
                        <span
                          className={`hero-progress__fill${plannedMinutes > capacityMinutes ? ' is-over' : ''}`}
                          style={{ width: `${Math.round(capacityRatio * 100)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </section>
                  <section className="quick-capture-card" aria-label="Captura rápida">
                    <div className="quick-capture-card__header">
                      <div>
                        <h2 className="quick-capture-card__title">Captura rápida</h2>
                      </div>
                    </div>
                    <div className="quick-capture-bar">
                      <QuickCaptureInput
                        placeholder="Digite qualquer coisa... tarefa, ideia, lembrete"
                        value={quickCapture}
                        onChange={setQuickCapture}
                        onSubmit={(value) => handleQuickCaptureSubmit(value)}
                      />
                      <button
                        type="button"
                        className="quick-capture-bar__add"
                        onClick={() => handleQuickCaptureSubmit()}
                        aria-label="Adicionar na inbox"
                      >
                        +
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </main>
        </>
      )}
      {showFab && (
        <button type="button" className="fab-add-task" onClick={handleAddTask} aria-label="Nova tarefa">
          <Plus size={22} aria-hidden="true" />
        </button>
      )}
      <BottomNavigation activeTab={activeTab} onSelect={handleSelectTab} />
      <InboxSheet
        isOpen={isInboxOpen}
        items={inboxItems}
        onClose={handleCloseInbox}
        onAddItem={addInboxItem}
        onConvertToTask={handleConvertToTask}
        onConvertToNote={handleConvertToNote}
        onDeleteItem={deleteInboxItem}
        onUpdateItem={updateInboxItem}
      />
      <TaskSheet
        isOpen={isTaskSheetOpen}
        task={activeTask}
        notes={notes}
        onClose={handleCloseTaskSheet}
        onUpdate={updateTask}
        onToggleDone={toggleTaskDone}
        onDelete={deleteTask}
        onOpenLinkedNotes={handleOpenLinkedNotes}
        onSelectNote={handleOpenNote}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onLinkNoteToTask={linkNoteToTask}
      />
      <LinkedNotesSheet
        isOpen={isLinkedNotesOpen}
        task={activeTask}
        notes={notes}
        onClose={handleCloseLinkedNotes}
        onSelectNote={handleOpenNote}
        onLinkNote={handleLinkNewNote}
      />
      <MonthCalendarModal
        isOpen={isCalendarOpen}
        monthDate={calendarMonth}
        selectedDayKey={selectedDayKey}
        onClose={() => setIsCalendarOpen(false)}
        onPrev={() =>
          setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
        }
        onNext={() =>
          setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
        }
        onSelectDay={handleSelectCalendarDay}
      />
      <NoteModal
        isOpen={isNoteModalOpen}
        note={activeNote ?? draftNote}
        onSave={handleSaveNote}
        onClose={handleCloseNoteModal}
        onLink={handleLinkFromNote}
      />
      <LinkNoteModal
        isOpen={isLinkModalOpen}
        noteId={linkNoteId}
        tasks={tasks}
        onClose={handleCloseLinkModal}
        onLink={linkNoteToTask}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        wakeTime={wakeTime}
        sleepTime={sleepTime}
        applyRoutineAllDays={applyRoutineAllDays}
        warnOverbooked={warnOverbooked}
        blockOverbooked={blockOverbooked}
        onClose={() => setIsSettingsOpen(false)}
        onChange={updateRoutine}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
      />
    </div>
  )
}

export default App
