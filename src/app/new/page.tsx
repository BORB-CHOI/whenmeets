import EventForm from '@/components/event-form/EventForm';

export default function NewEventPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">이벤트 만들기</h1>
      <EventForm />
    </div>
  );
}
