// Substitueix tota la funció renderMes() per aquesta:
function renderMes() {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Correccio: getDay() retorna 0=diumenge, cal ajustar a dilluns=0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const days: (Date | null)[] = []
  
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      days.push(null)
    } else {
      // IMPORTANT: usar noon per evitar problemes de timezone
      days.push(new Date(year, month, dayNum, 12, 0, 0))
    }
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_CA.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-semibold ${
                i >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date, idx) => {
            if (!date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[80px] border-b border-r border-border bg-muted/20"
                />
              )
            }

            // IMPORTANT: format de data local, no UTC
            const d = date
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const special = isSpecialDay(date)
            const dayAbsences = getAbsencesForDay(date)

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setSelectedDay(date)
                  setCurrentDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
                  setViewMode('dia')
                }}
                className={`min-h-[80px] border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/40 ${
                  isWeekend ? 'bg-muted/30' : ''
                } ${special.holiday || special.closure ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-tramit-blue text-white'
                        : isWeekend
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
                {special.name && (
                  <div
                    className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight mb-1 truncate"
                    title={special.name}
                  >
                    {special.name}
                  </div>
                )}
                <div className="space-y-0.5">
                  {dayAbsences.slice(0, 3).map(abs => {
                    const profile = abs.profiles as { full_name: string; color: string | null } | null
                    const color = profile?.color || '#2272A3'
                    const name = profile?.full_name || '—'
                    return (
                      <div
                        key={abs.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5"
                        style={{
                          backgroundColor: color + '25',
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        <div
                          className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{
                            backgroundColor: color,
                            fontSize: '7px',
                            fontWeight: 700,
                          }}
                        >
                          {getInitials(name)}
                        </div>
                        <span
                          className="text-[9px] truncate font-medium"
                          style={{ color }}
                        >
                          {name.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                  {dayAbsences.length > 3 && (
                    <div className="text-[9px] text-muted-foreground pl-1">
                      +{dayAbsences.length - 3} més
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
