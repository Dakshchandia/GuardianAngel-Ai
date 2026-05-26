"use client";

import { useState } from "react";
import { Users, Plus, Trash2, Phone, Edit2, Check, X } from "lucide-react";
import { FamilyContact } from "@/lib/types";
import toast from "react-hot-toast";

interface FamilyContactsProps {
  contacts: FamilyContact[];
  onUpdate: (contacts: FamilyContact[]) => void;
}

const RELATIONSHIPS = ["Parent", "Child", "Spouse", "Sibling", "Friend", "Other"];

export default function FamilyContacts({ contacts, onUpdate }: FamilyContactsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "Child" });

  const handleAdd = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error("Please fill in name and phone number");
      return;
    }
    if (contacts.length >= 5) {
      toast.error("Maximum 5 contacts allowed");
      return;
    }
    const contact: FamilyContact = {
      id: Date.now().toString(),
      ...newContact,
      alertEnabled: true,
    };
    onUpdate([...contacts, contact]);
    setNewContact({ name: "", phone: "", relationship: "Child" });
    setIsAdding(false);
    toast.success(`${contact.name} added to family contacts`);
  };

  const handleDelete = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    onUpdate(contacts.filter((c) => c.id !== id));
    toast.success(`${contact?.name} removed`);
  };

  const handleToggleAlert = (id: string) => {
    onUpdate(
      contacts.map((c) =>
        c.id === id ? { ...c, alertEnabled: !c.alertEnabled } : c
      )
    );
  };

  const relationshipColors: Record<string, string> = {
    Parent: "text-warning bg-warning/10 border-warning/20",
    Child: "text-primary bg-primary/10 border-primary/20",
    Spouse: "text-safe bg-safe/10 border-safe/20",
    Sibling: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    Friend: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Other: "text-text-muted bg-white/5 border-white/10",
  };

  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Family Contacts</h3>
            <p className="text-text-muted text-xs">{contacts.length}/5 contacts added</p>
          </div>
        </div>
        {contacts.length < 5 && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Contact list */}
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {contact.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm truncate">{contact.name}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    relationshipColors[contact.relationship] || relationshipColors.Other
                  }`}
                >
                  {contact.relationship}
                </span>
              </div>
              <p className="text-text-muted text-xs font-mono mt-0.5">{contact.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Alert toggle */}
              <button
                onClick={() => handleToggleAlert(contact.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  contact.alertEnabled
                    ? "bg-safe/10 border border-safe/20 text-safe"
                    : "bg-white/5 border border-white/10 text-text-muted"
                }`}
                title={contact.alertEnabled ? "Alerts enabled" : "Alerts disabled"}
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(contact.id)}
                className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center justify-center hover:bg-danger/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add contact form */}
        {isAdding && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 animate-fade-in-up">
            <h4 className="text-white text-sm font-semibold">Add New Contact</h4>
            <input
              type="text"
              placeholder="Full Name"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
            <select
              value={newContact.relationship}
              onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 rounded-lg bg-primary text-background font-bold text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Add Contact
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-text-muted text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {contacts.length === 0 && !isAdding && (
          <div className="text-center py-8 space-y-3">
            <Users className="w-10 h-10 text-text-muted mx-auto opacity-40" />
            <p className="text-text-muted text-sm">No contacts added yet</p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-primary text-sm underline"
            >
              Add your first contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
