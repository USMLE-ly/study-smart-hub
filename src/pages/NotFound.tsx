import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const isComingSoon = [
    "/qbank/history",
    "/qbank/performance",
    "/qbank/search",
    "/qbank/notes",
    "/flashcards/study",
    "/flashcards/decks",
    "/notebook",
    "/help",
  ].includes(location.pathname);

  useEffect(() => {
    if (!isComingSoon) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, isComingSoon]);

  if (isComingSoon) {
    const pageName = location.pathname.split("/").pop()?.replace(/-/g, " ") || "Page";
    const formattedName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    return (
      <AppLayout title={formattedName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-primary/10 p-4">
                  <Construction className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                This feature is under development. Check back soon for updates!
              </p>
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-8 text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Oops! The page you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
