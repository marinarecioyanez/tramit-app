{activeTab === 'festius' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Festius no laborables {selectedYear}</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {[2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="tramit" onClick={() => setShowHolidayForm(true)} className="flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Afegir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showHolidayForm && (
                <div className="flex gap-2 items-end p-3 bg-muted/50 rounded-lg flex-wrap">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Data</label>
                    <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))} className="h-8 w-36" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[140px]">
                    <label className="text-xs font-medium">Nom</label>
                    <Input value={newHoliday.name} onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))} placeholder="Nom del festiu" className="h-8" />
                  </div>
                  <Button size="sm" variant="tramit" onClick={handleAddHoliday} disabled={!newHoliday.date || !newHoliday.name}>Afegir</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowHolidayForm(false)}>Cancel·lar</Button>
                </div>
              )}
              {localHolidays.filter(h => h.year === selectedYear).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hi ha festius per a {selectedYear}</p>
              ) : (
                <div className="space-y-2">
                  {localHolidays.filter(h => h.year === selectedYear).sort((a, b) => a.date.localeCompare(b.date)).map(holiday => {
                    const date = new Date(holiday.date + 'T12:00:00')
                    return (
                      <div key={holiday.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="text-center bg-tramit-blue text-white rounded-lg p-2 min-w-[48px]">
                            <div className="text-xs font-medium">{MONTH_NAMES[date.getMonth()]}</div>
                            <div className="text-lg font-bold leading-none">{date.getDate()}</div>
                          </div>
                          <p className="text-sm font-medium">{holiday.name}</p>
                        </div>
                        <button onClick={() => handleDeleteHoliday(holiday.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
