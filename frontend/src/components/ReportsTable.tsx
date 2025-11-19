import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCaption } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import EmptyState from './ui/empty-state';

type Report = {
  id: string;
  name: string;
  status: 'hazır' | 'işleniyor' | 'hata';
  updatedAt: string;
};

const SAMPLE: Report[] = [
  { id: 'R-001', name: 'Satış KPI - Q3', status: 'hazır', updatedAt: '2025-10-01' },
  { id: 'R-002', name: 'Performans Özeti', status: 'işleniyor', updatedAt: '2025-10-25' },
  { id: 'R-003', name: 'Müşteri Memnuniyeti', status: 'hata', updatedAt: '2025-10-20' },
  { id: 'R-004', name: 'Bölgesel Satışlar', status: 'hazır', updatedAt: '2025-10-22' },
];

export default function ReportsTable() {
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return SAMPLE.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Ara (ID veya isim)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Arama kriterlerinizi değiştirin veya filtreleri temizleyin."
        />
      ) : (
        <Table>
          <TableHeader sticky>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Rapor</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Güncellendi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  {r.status === 'hazır' && <Badge variant="default">hazır</Badge>}
                  {r.status === 'işleniyor' && <Badge variant="secondary">işleniyor</Badge>}
                  {r.status === 'hata' && <Badge variant="outline">hata</Badge>}
                </TableCell>
                <TableCell>{r.updatedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption>{filtered.length} kayıt gösteriliyor</TableCaption>
        </Table>
      )}
    </div>
  );
}