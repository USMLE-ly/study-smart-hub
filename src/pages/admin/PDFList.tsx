import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, CheckCircle, Clock, AlertCircle, Lock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDF {
  id: string;
  filename: string;
  order_index: number;
  status: string;
  total_questions: number;
  processed_questions: number;
  created_at: string;
}

const PDFList = () => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredPdfs = statusFilter === 'all' 
    ? pdfs 
    : pdfs.filter(pdf => pdf.status === statusFilter);

  useEffect(() => {
    if (user) {
      loadPDFs();
    }
  }, [user]);

  const loadPDFs = async () => {
    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
      setPdfs(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const canProcess = (pdf: PDF, index: number) => {
    if (index === 0) return pdf.status === 'pending' || pdf.status === 'in_progress';
    const prevPdf = pdfs[index - 1];
    return prevPdf?.status === 'verified' && (pdf.status === 'pending' || pdf.status === 'in_progress');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">PDF Management</h1>
          <p className="text-muted-foreground mt-1">
            Process PDFs in strict order. Each must be verified before the next unlocks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/admin/pdfs/upload')}>
            <Plus className="w-4 h-4 mr-2" />
            Upload PDFs
          </Button>
        </div>
      </div>

      {pdfs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PDFs uploaded</h3>
            <p className="text-muted-foreground mb-4">Upload your first batch of PDFs to get started</p>
            <Button onClick={() => navigate('/admin/pdfs/upload')}>
              <Plus className="w-4 h-4 mr-2" />
              Upload PDFs
            </Button>
          </CardContent>
        </Card>
      ) : filteredPdfs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PDFs match filter</h3>
            <p className="text-muted-foreground mb-4">Try selecting a different status filter</p>
            <Button variant="outline" onClick={() => setStatusFilter('all')}>
              Show All PDFs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPdfs.map((pdf) => {
            const originalIndex = pdfs.findIndex(p => p.id === pdf.id);
            const progress = pdf.total_questions > 0 
              ? (pdf.processed_questions / pdf.total_questions) * 100 
              : 0;
            const processable = canProcess(pdf, originalIndex);
            const isLocked = !processable && pdf.status === 'pending';

            return (
              <Card 
                key={pdf.id} 
                className={`transition-all ${
                  isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'
                }`}
                onClick={() => processable && navigate(`/admin/pdfs/${pdf.id}/process`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      {pdf.order_index}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(pdf.status)}
                        <h3 className="font-semibold">{pdf.filename}</h3>
                        {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pdf.total_questions > 0 
                          ? `${pdf.processed_questions}/${pdf.total_questions} questions processed`
                          : 'Not started'
                        }
                      </p>
                      {pdf.total_questions > 0 && (
                        <Progress value={progress} className="h-1 mt-2" />
                      )}
                    </div>

                    <Badge variant={
                      pdf.status === 'verified' ? 'default' :
                      pdf.status === 'completed' ? 'secondary' :
                      pdf.status === 'in_progress' ? 'outline' : 'destructive'
                    }>
                      {pdf.status}
                    </Badge>

                    {processable && (
                      <Button size="sm">
                        {pdf.status === 'pending' ? 'Start' : 'Continue'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {pdfs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Processing Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{pdfs.length}</p>
                <p className="text-sm text-muted-foreground">Total PDFs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {pdfs.filter(p => p.status === 'verified').length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {pdfs.filter(p => p.status === 'in_progress').length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pdfs.reduce((sum, p) => sum + p.total_questions, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PDFList;
