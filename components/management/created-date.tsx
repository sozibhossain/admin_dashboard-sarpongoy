const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "medium",
  timeZone: "UTC",
});

export function CreatedDate({ value }: { value?: string | null }) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return <span className="text-[#6c6c6c]">Unavailable</span>;
  }

  return (
    <time dateTime={date.toISOString()} title={`${timestampFormatter.format(date)} UTC`}>
      {dateFormatter.format(date)}
    </time>
  );
}
