import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Users,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { contactsApi } from '../lib/api';
import { toast } from 'sonner';

const ContactCard = ({ contact, onEdit, onDelete }) => {
  return (
    <Card className="bg-[#202940] border-white/5 hover:border-[#FFC300]/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">{contact.name}</h3>
            {contact.breeder_number && (
              <p className="text-sm text-slate-400 font-mono">#{contact.breeder_number}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(contact)}
              className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] hover:bg-[#FFC300]/10 transition-colors"
              data-testid={`edit-contact-${contact.id}`}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(contact)}
              className="p-2 rounded-lg text-slate-400 hover:text-[#E91E63] hover:bg-[#E91E63]/10 transition-colors"
              data-testid={`delete-contact-${contact.id}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Phone size={14} className="text-slate-500" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Mail size={14} className="text-slate-500" />
              <span>{contact.email}</span>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin size={14} className="text-slate-500" />
              <span>{contact.address}</span>
            </div>
          )}
        </div>

        {contact.notes && (
          <p className="mt-4 text-sm text-slate-400 border-t border-white/5 pt-4">
            {contact.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingContact, setEditingContact] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    breeder_number: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const fetchContacts = async () => {
    try {
      const res = await contactsApi.getAll();
      setContacts(res.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      breeder_number: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactsApi.update(editingContact.id, formData);
        toast.success('Contact updated');
      } else {
        await contactsApi.create(formData);
        toast.success('Contact added');
      }
      setDialogOpen(false);
      setEditingContact(null);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error('Failed to save contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      breeder_number: contact.breeder_number || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      notes: contact.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await contactsApi.delete(deleteDialog.id);
      toast.success('Contact deleted');
      setDeleteDialog(null);
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Contacts
          </h1>
          <p className="text-slate-400 mt-1">
            {contacts.length} breeder contacts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingContact(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-contact-btn"
            >
              <Plus size={20} className="mr-2" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                  className="bg-[#1A2035] border-white/10 text-white"
                  required
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Breeder Number</Label>
                <Input
                  value={formData.breeder_number}
                  onChange={(e) => setFormData({ ...formData, breeder_number: e.target.value })}
                  placeholder="e.g., PT-123"
                  className="bg-[#1A2035] border-white/10 text-white font-mono"
                  data-testid="contact-breeder-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="contact-phone-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="contact-email-input"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="City, Country"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="contact-address-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  className="bg-[#1A2035] border-white/10 text-white min-h-[80px]"
                  data-testid="contact-notes-input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                  data-testid="save-contact-btn"
                >
                  {editingContact ? 'Update' : 'Add'} Contact
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Contacts Yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Add contacts for other breeders you work with. Keep track of their information for easy reference.
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEdit}
              onDelete={setDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this contact. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-contact"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
