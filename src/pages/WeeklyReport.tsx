import { AppLayout } from "@/components/layout/AppLayout";
import { WeeklyStudyReport } from "@/components/reports/WeeklyStudyReport";
import { PageTransition } from "@/components/ui/PageTransition";

const WeeklyReportPage = () => {
  return (
    <AppLayout title="Weekly Report">
      <PageTransition>
        <div className="max-w-5xl mx-auto">
          <WeeklyStudyReport />
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default WeeklyReportPage;