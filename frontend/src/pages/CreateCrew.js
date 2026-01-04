import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crewAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ArrowLeft, Lock, Globe } from 'lucide-react';

const CreateCrew = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('invite_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Crew name is required');
      return;
    }

    setLoading(true);

    try {
      const response = await crewAPI.create({ name: name.trim(), type });
      navigate(`/crews/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create crew');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto" data-testid="create-crew-page">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create a Crew</CardTitle>
            <CardDescription>
              Crews help you quickly target your regular playing groups
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Crew Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tuesday Night Crew"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="crew-name-input"
                />
              </div>

              <div className="space-y-4">
                <Label>Crew Type</Label>
                <RadioGroup value={type} onValueChange={setType}>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="invite_only" id="type-invite" className="mt-1" />
                    <div>
                      <Label htmlFor="type-invite" className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Invite Only
                      </Label>
                      <p className="text-xs text-gray-500">Only you can add members</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="open" id="type-open" className="mt-1" />
                    <div>
                      <Label htmlFor="type-open" className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Open
                      </Label>
                      <p className="text-xs text-gray-500">Anyone can join</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                data-testid="create-crew-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Crew'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateCrew;
