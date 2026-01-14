import { useEffect, useMemo, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import InboxSheet from './components/InboxSheet'
import LinkedNotesSheet from './components/LinkedNotesSheet'
import MonthCalendarModal from './components/MonthCalendarModal'
import SettingsModal from './components/SettingsModal'
import TaskSheet from './components/TaskSheet'
import TopBar from './components/TopBar'
import WeekStrip from './components/WeekStrip'
import TaskList from './components/TaskList'
import NotesView from './views/NotesView'
import { useAppStore } from './store/useAppStore'
import type { Task } from './types/task'
import { startSync } from './sync/syncManager'

const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

const buildWeekDays = (baseDate: Date) => {
  const todayKey = baseDate.toISOString().slice(0, 10)
  const dayIndex = (baseDate.getDay() + 6) % 7
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - dayIndex)

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: date.toISOString().slice(0, 10),
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
    isReady,
    init,
    addInboxItem,
    convertInboxToTask,
    updateTask,
    toggleTaskDone,
    deleteTask,
    setSelectedDayKey,
    updateRoutine,
    isOverbookedForDay,
  } = useAppStore()
  const baseDate = useMemo(() => new Date(selectedDayKey), [selectedDayKey])
  const { todayKey, days } = useMemo(() => buildWeekDays(baseDate), [baseDate])
  const [activeTab, setActiveTab] = useState<'today' | 'notes' | 'inbox'>('today')
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isLinkedNotesOpen, setIsLinkedNotesOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const visibleTasks = tasks.filter((task) => task.dayKey === selectedDayKey)
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

  const handleSelectTab = (tab: 'today' | 'notes' | 'inbox') => {
    setActiveTab(tab)
    setIsInboxOpen(tab === 'inbox')
  }

  const handleCloseInbox = () => {
    setIsInboxOpen(false)
    setActiveTab('today')
  }

  const handleConvertToTask = (id: string) => {
    convertInboxToTask(id, selectedDayKey)
    handleCloseInbox()
  }

  const handleConvertToNote = (_id: string) => {}

  const handleSelectTask = (task: Task) => {
    setActiveTaskId(task.id)
    setIsTaskSheetOpen(true)
  }

  const handleCloseTaskSheet = () => {
    setIsTaskSheetOpen(false)
  }

  const handleOpenCalendar = () => {
    setCalendarMonth(new Date(selectedDayKey))
    setIsCalendarOpen(true)
  }

  const handleSelectCalendarDay = (date: Date) => {
    setSelectedDayKey(date.toISOString().slice(0, 10))
    setIsCalendarOpen(false)
  }

  const overbookedKeys = useMemo(() => {
    return new Set(days.filter((day) => isOverbookedForDay(day.key)).map((day) => day.key))
  }, [days, isOverbookedForDay])

  if (!isReady) {
    return <div className="app-shell" />
  }

  return (
    <div className="app-shell">
      {activeTab === 'notes' ? (
        <NotesView />
      ) : (
        <>
          <TopBar title="Semana 14-20" onCalendarClick={handleOpenCalendar} onSettingsClick={() => setIsSettingsOpen(true)} />
          <main className="app-content">
            <div className="home-stack">
              <h1 className="page-title">Hoje / Semana</h1>
              <WeekStrip
                days={days}
                selectedKey={selectedDayKey}
                todayKey={todayKey}
                overbookedKeys={overbookedKeys}
                onSelect={setSelectedDayKey}
              />
              <TaskList tasks={visibleTasks} onSelectTask={handleSelectTask} />
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
        onConvertToNote={handleConvertToNote}
      />
      <TaskSheet
        isOpen={isTaskSheetOpen}
        task={activeTask}
        notes={notes}
        onClose={handleCloseTaskSheet}
        onUpdate={updateTask}
        onToggleDone={toggleTaskDone}
        onDelete={deleteTask}
        onOpenLinkedNotes={() => setIsLinkedNotesOpen(true)}
      />
      <LinkedNotesSheet
        isOpen={isLinkedNotesOpen}
        task={activeTask}
        notes={notes}
        onClose={() => setIsLinkedNotesOpen(false)}
      />
      <MonthCalendarModal
        isOpen={isCalendarOpen}
        monthDate={calendarMonth}
        onClose={() => setIsCalendarOpen(false)}
        onPrev={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
        onNext={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
        onSelectDay={handleSelectCalendarDay}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        wakeTime={wakeTime}
        sleepTime={sleepTime}
        onClose={() => setIsSettingsOpen(false)}
        onChange={updateRoutine}
      />
    </div>
  )
}

export default App

