// app/users/page.tsx
import { getAllTasks } from '@/actions/task';
import EmptyTasks from '@/components/empty-tasks';
import TaskDrawer from '@/components/task-drawer';
import Tasks from '@/components/tasks';
import { Task } from '@/types/task';

export default async function Page() {
  const allTasks = await getAllTasks();

  return (
    <div className='container mx-auto p-5'>
      <div className='flex items-center justify-between mb-5'>
        <h1 className='text-2xl font-bold'>All Tasks</h1>
        <TaskDrawer variant='icon' />
      </div>
      {
        (allTasks && allTasks.length > 0)
          ? <Tasks tasks={allTasks as Task[]} />
          : <EmptyTasks />
      }
    </div >
  )
}