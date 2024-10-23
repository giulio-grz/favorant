import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const RestaurantNotes = ({ user, restaurantId }) => {
  const [notes, setNotes] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isDeletingNote, setIsDeletingNote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [restaurantId, user.id]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to fetch notes');
    }
  };

  const handleAddNote = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: user.id,
          restaurant_id: restaurantId,
          note: noteText
        }])
        .select();

      if (error) throw error;
      setNotes([...notes, data[0]]);
      setIsAddingNote(false);
      setNoteText('');
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note');
    }
  };

  const handleEditNote = async (noteId) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ note: noteText })
        .eq('id', noteId);

      if (error) throw error;
      setNotes(notes.map(note => 
        note.id === noteId ? { ...note, note: noteText } : note
      ));
      setIsEditingNote(null);
      setNoteText('');
    } catch (error) {
      console.error('Error editing note:', error);
      setError('Failed to edit note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      setNotes(notes.filter(note => note.id !== noteId));
      setIsDeletingNote(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4 mb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notes</h2>
        <Button onClick={() => setIsAddingNote(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notes yet. Add your first note!</p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{note.note}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {formatDate(note.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingNote(note.id);
                      setNoteText(note.note);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDeletingNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingNote(false);
              setNoteText('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingNote !== null} onOpenChange={() => setIsEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Edit your note..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditingNote(null);
              setNoteText('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleEditNote(isEditingNote)} 
              disabled={!noteText.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeletingNote !== null} onOpenChange={() => setIsDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeletingNote(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteNote(isDeletingNote)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>{error}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setError(null)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default RestaurantNotes;