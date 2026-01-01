import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, GraduationCap, Calendar, Clock, Target, LogOut } from "lucide-react";

const Profile = () => {
  const { profile, loading, updateProfile } = useProfile();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    medical_school: profile?.medical_school || "",
    year_of_study: profile?.year_of_study || "",
    target_exam_date: profile?.target_exam_date || "",
    timezone: profile?.timezone || "America/New_York",
    study_goal_hours_per_day: profile?.study_goal_hours_per_day || 4,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSave = async () => {
    const { error } = await updateProfile(formData);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile?.full_name || "User"}
                </h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile Details</CardTitle>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Medical School
                </Label>
                <Input
                  value={formData.medical_school}
                  onChange={(e) =>
                    setFormData({ ...formData, medical_school: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Enter your medical school"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Year of Study
                </Label>
                <Input
                  value={formData.year_of_study}
                  onChange={(e) =>
                    setFormData({ ...formData, year_of_study: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="e.g., MS2, MS3"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target Exam Date
                </Label>
                <Input
                  type="date"
                  value={formData.target_exam_date}
                  onChange={(e) =>
                    setFormData({ ...formData, target_exam_date: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Daily Study Goal (hours)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={formData.study_goal_hours_per_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      study_goal_hours_per_day: parseInt(e.target.value) || 4,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Stats Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Study Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Tests Completed</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Questions Answered</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-3xl font-bold text-foreground">0h</p>
                <p className="text-sm text-muted-foreground">Study Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;