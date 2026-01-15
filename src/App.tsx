import { useEffect, useMemo, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import InboxSheet from './components/InboxSheet'
import LinkedNotesSheet from './components/LinkedNotesSheet'
import LinkNoteModal from './components/LinkNoteModal'
import MonthCalendarModal from './components/MonthCalendarModal'
import NoteModal from './components/NoteModal'
import SettingsModal from './components/SettingsModal'
import TaskSheet from './components/TaskSheet'
import TopBar from './components/TopBar'
import WeekStrip from './components/WeekStrip'
import TaskList from './components/TaskList'
import NotesView from './views/NotesView'
import { useAppStore } from './store/useAppStore'
import type { Note } from './types/note'
import type { Task } from './types/task'
import { pullChanges, pushChanges, startSync } from './sync/syncManager'

const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

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
  const todayKey = formatLocalDayKey(baseDate)
  const dayIndex = (baseDate.getDay() + 6) % 7
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - dayIndex)

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: formatLocalDayKey(date),
      label: dayNames[index],
      number: date.getDate(),
    }
  })

  return { todayKey, days }
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
    linkNoteToTask,
    runTimeTick,
    convertInboxToTask,
    updateTask,
    toggleTaskDone,
    deleteTask,
    setSelectedDayKey,
    updateRoutine,
    isOverbookedForDay,
  } = useAppStore()
  const baseDate = useMemo(() => parseDayKeyToDate(selectedDayKey), [selectedDayKey])
  const { todayKey, days } = useMemo(() => buildWeekDays(baseDate), [baseDate])
  const [activeTab, setActiveTab] = useState<'today' | 'notes'>('today')
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const visibleTasks = tasks.filter((task) => {
    if (task.dayKey === selectedDayKey) {
      return true
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
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!isReady) {
      return
    }
    return startSync()
  }, [isReady])

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

  const closeAllOverlays = () => {
    setIsInboxOpen(false)
    setIsTaskSheetOpen(false)
    setIsLinkedNotesOpen(false)
    setIsCalendarOpen(false)
    setIsSettingsOpen(false)
  }

  const resetNoteModalState = () => {
    setActiveNote(null)
    setDraftNote(null)
    setLinkTargetTaskId(null)
  }

  const handleSelectTab = (tab: 'today' | 'notes') => {
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
    setCalendarMonth(new Date(selectedDayKey))
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

  const handleForceSync = async () => {
    if (isSyncing || !navigator.onLine) {
      if (!navigator.onLine) {
        setToast({ type: 'error', message: 'Sem conexao com a internet.' })
      }
      return
    }
    setIsSyncing(true)
    try {
      await pushChanges()
      await pullChanges()
      setToast({ type: 'success', message: 'Sincronizacao concluida.' })
    } catch {
      setToast({ type: 'error', message: 'Falha ao sincronizar.' })
    } finally {
      setIsSyncing(false)
    }
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

  const handleSaveNote = (data: { title: string; body: string }) => {
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

  const handleLinkFromNote = (data: { title: string; body: string }) => {
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

  if (!isReady) {
    return <div className="app-shell" />
  }

  return (
    <div className="app-shell">
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
      {activeTab === 'notes' ? (
        <NotesView />
      ) : (
        <>
          <TopBar
            title="Semana 14-20 Jan"
            onCalendarClick={handleOpenCalendar}
            onNotesClick={handleOpenNotes}
            onInboxClick={handleOpenInbox}
            onSettingsClick={handleOpenSettings}
          />
          <main className="app-content">
            <div className="home-stack">
              <h1 className="page-title">Hoje / Semana</h1>
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
                onAddTask={handleAddTask}
              />
            </div>
          </main>
        </>
      )}
      <BottomNavigation activeTab={activeTab} onSelect={handleSelectTab} />
      <InboxSheet
        isOpen={isInboxOpen}
        items={inboxItems}
        onClose={handleCloseInbox}
        onAddItem={addInboxItem}
        onConvertToTask={handleConvertToTask}
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
        onPrev={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
        onNext={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
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

