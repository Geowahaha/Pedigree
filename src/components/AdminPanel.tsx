import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pet, pets } from '@/data/petData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pets' | 'verifications' | 'users'>('pets');
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [petList, setPetList] = useState<Pet[]>(pets);
    const [selectedPets, setSelectedPets] = useState<string[]>([]);

    // Filter logic for Pets tab
    const filteredPets = petList.filter(pet =>
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.registrationNumber && pet.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter logic for Verifications tab
    const pendingVerifications = petList.filter(pet =>
        pet.parentIds && (pet.parentIds.sireStatus === 'pending' || pet.parentIds.damStatus === 'pending')
    );

    // Empty template for new pet
    const emptyPet: Pet = {
        id: '',
        name: '',
        breed: '',
        type: 'dog',
        gender: 'male',
        birthDate: new Date().toISOString().split('T')[0],
        image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop',
        color: '',
        location: 'Bangkok, Thailand',
        owner: 'Admin',
        healthCertified: false,
        parentIds: { sire: '', dam: '', sireStatus: 'verified', damStatus: 'verified' }
    };

    const handleSavePet = (pet: Pet) => {
        if (isCreating) {
            const newPet = { ...pet, id: `pet-${Date.now()}` };
            setPetList([newPet, ...petList]);
            alert(`Created new pet: ${newPet.name}`);
        } else {
            const updatedList = petList.map(p => p.id === pet.id ? pet : p);
            setPetList(updatedList);
            alert(`Updated pet: ${pet.name}`);
        }
        setEditingPet(null);
        setIsCreating(false);
    };

    const handleDeletePet = (id: string) => {
        if (confirm("Are you sure you want to delete this pet? This action cannot be undone.")) {
            setPetList(petList.filter(p => p.id !== id));
        }
    };

    const handleVerify = (petId: string, type: 'sire' | 'dam', action: 'verified' | 'rejected') => {
        const updatedList = petList.map(p => {
            if (p.id === petId && p.parentIds) {
                return {
                    ...p,
                    parentIds: {
                        ...p.parentIds,
                        [type === 'sire' ? 'sireStatus' : 'damStatus']: action
                    }
                };
            }
            return p;
        });
        setPetList(updatedList);
    };

    const startCreate = () => {
        setEditingPet(emptyPet);
        setIsCreating(true);
    };

    const toggleSelectAll = () => {
        if (selectedPets.length === filteredPets.length) {
            setSelectedPets([]);
        } else {
            setSelectedPets(filteredPets.map(p => p.id));
        }
    };

    const toggleSelectPet = (id: string) => {
        setSelectedPets(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const exportToCSV = () => {
        const petsToExport = selectedPets.length > 0
            ? petList.filter(p => selectedPets.includes(p.id))
            : petList;

        const headers = ['ID', 'Name', 'Breed', 'Type', 'Gender', 'Birth Date', 'Color', 'Location', 'Owner', 'Registration Number', 'Health Certified'];
        const rows = petsToExport.map(pet => [
            pet.id,
            pet.name,
            pet.breed,
            pet.type,
            pet.gender,
            pet.birthDate,
            pet.color,
            pet.location,
            pet.owner,
            pet.registrationNumber || '',
            pet.healthCertified ? 'Yes' : 'No'
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `petdegree_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`Exported ${petsToExport.length} pet(s) to CSV`);
    };

    const bulkDelete = () => {
        if (selectedPets.length === 0) {
            alert('No pets selected');
            return;
        }
        if (confirm(`Are you sure you want to delete ${selectedPets.length} selected pet(s)? This action cannot be undone.`)) {
            setPetList(petList.filter(p => !selectedPets.includes(p.id)));
            setSelectedPets([]);
            alert(`Deleted ${selectedPets.length} pet(s)`);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[95vh] h-[90vh] flex flex-col p-0 gap-0 bg-gray-50/50">
                <div className="p-6 border-b bg-white flex justify-between items-center">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </div>
                        System Administration
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar */}
                    <div className="w-64 bg-white border-r hidden md:block pt-4 text-sm">
                        <div className="bg-primary/5 mx-4 p-3 rounded-xl mb-6">
                            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">Total Records</p>
                            <p className="text-2xl font-bold text-primary">{petList.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">{pendingVerifications.length} Pending Actions</p>
                        </div>

                        <nav className="space-y-1 px-2">
                            <button
                                onClick={() => { setActiveTab('pets'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'pets' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                Manage Pets
                            </button>
                            <button
                                onClick={() => { setActiveTab('verifications'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'verifications' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Verifications
                                {pendingVerifications.length > 0 && (
                                    <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{pendingVerifications.length}</span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                User Management
                            </button>
                        </nav>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        {/* 1. PET EDITOR (Overlay on 'pets' tab) */}
                        {activeTab === 'pets' && editingPet ? (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                                    <h3 className="font-bold text-lg text-gray-800">
                                        {isCreating ? 'Create New Entry' : `Editing: ${editingPet.name}`}
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setEditingPet(null); setIsCreating(false); }}>Cancel</Button>
                                        <Button onClick={() => handleSavePet(editingPet)} className="bg-primary text-white hover:bg-primary/90">
                                            {isCreating ? 'Create Record' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 p-6">
                                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                                        {/* Basic Info */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b text-primary font-semibold">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                                Identity
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Name</Label>
                                                    <Input value={editingPet.name} onChange={e => setEditingPet({ ...editingPet, name: e.target.value })} placeholder="Pet Name" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Registration No.</Label>
                                                    <Input value={editingPet.registrationNumber || ''} onChange={e => setEditingPet({ ...editingPet, registrationNumber: e.target.value })} placeholder="TRD-XXXX" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Species</Label>
                                                    <Select value={editingPet.type} onValueChange={(val: any) => setEditingPet({ ...editingPet, type: val })}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="dog">Dog</SelectItem>
                                                            <SelectItem value="cat">Cat</SelectItem>
                                                            <SelectItem value="horse">Horse</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Gender</Label>
                                                    <Select value={editingPet.gender} onValueChange={(val: any) => setEditingPet({ ...editingPet, gender: val })}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Breed</Label>
                                                <Input value={editingPet.breed} onChange={e => setEditingPet({ ...editingPet, breed: e.target.value })} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Birth Date</Label>
                                                    <Input type="date" value={editingPet.birthDate} onChange={e => setEditingPet({ ...editingPet, birthDate: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Color</Label>
                                                    <Input value={editingPet.color} onChange={e => setEditingPet({ ...editingPet, color: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details & Pedigree */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b text-primary font-semibold">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Details & Pedigree
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Photo URL</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <Input value={editingPet.image} onChange={e => setEditingPet({ ...editingPet, image: e.target.value })} className="text-xs font-mono" />
                                                    </div>
                                                    <div className="w-10 h-10 rounded border overflow-hidden bg-gray-100 flex-shrink-0">
                                                        <img src={editingPet.image} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Owner</Label>
                                                    <Input value={editingPet.owner} onChange={e => setEditingPet({ ...editingPet, owner: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Location</Label>
                                                    <Input value={editingPet.location} onChange={e => setEditingPet({ ...editingPet, location: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 py-2">
                                                <Checkbox
                                                    id="cert"
                                                    checked={editingPet.healthCertified}
                                                    onCheckedChange={(checked: boolean) => setEditingPet({ ...editingPet, healthCertified: checked })}
                                                />
                                                <Label htmlFor="cert" className="cursor-pointer">Health Certified Record</Label>
                                            </div>

                                            <div className="p-4 bg-muted/20 rounded-xl space-y-4 border border-dashed border-primary/20">
                                                <h4 className="text-sm font-bold text-gray-700">Pedigree Connections</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-xs uppercase">Sire (ID)</Label>
                                                            <Label className="text-xs uppercase text-right">Status</Label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={editingPet.parentIds?.sire || ''}
                                                                onChange={e => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, sire: e.target.value, sireStatus: editingPet.parentIds?.sireStatus || 'verified' }
                                                                } as any)}
                                                                placeholder="Sire ID"
                                                                className="h-8 text-xs flex-1"
                                                            />
                                                            <Select
                                                                value={editingPet.parentIds?.sireStatus || 'verified'}
                                                                onValueChange={(val: any) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, sireStatus: val }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="verified">Verified</SelectItem>
                                                                    <SelectItem value="pending">Pending</SelectItem>
                                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-xs uppercase">Dam (ID)</Label>
                                                            <Label className="text-xs uppercase text-right">Status</Label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={editingPet.parentIds?.dam || ''}
                                                                onChange={e => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, dam: e.target.value, damStatus: editingPet.parentIds?.damStatus || 'verified' }
                                                                } as any)}
                                                                placeholder="Dam ID"
                                                                className="h-8 text-xs flex-1"
                                                            />
                                                            <Select
                                                                value={editingPet.parentIds?.damStatus || 'verified'}
                                                                onValueChange={(val: any) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, damStatus: val }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="verified">Verified</SelectItem>
                                                                    <SelectItem value="pending">Pending</SelectItem>
                                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : activeTab === 'pets' ? (
                            /* --- LIST MODE --- */
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Bulk Actions Toolbar */}
                                {selectedPets.length > 0 && (
                                    <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center gap-4">
                                        <span className="text-sm font-bold text-primary">
                                            {selectedPets.length} pet(s) selected
                                        </span>
                                        <div className="flex gap-2 ml-auto">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={exportToCSV}
                                                className="text-green-700 border-green-300 hover:bg-green-50"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Export CSV
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={bulkDelete}
                                                className="text-red-700 border-red-300 hover:bg-red-50"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedPets([])}
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 border-b flex gap-4 bg-gray-50/50">

                                    <div className="relative flex-1 max-w-md">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <Input
                                            placeholder="Search by name, breed, or Reg ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                    <Button className="ml-auto bg-primary text-white shadow-sm hover:bg-primary/90" onClick={startCreate}>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add New Record
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 bg-gray-50/30">
                                    <div className="p-4">
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3 w-12">
                                                            <Checkbox
                                                                checked={selectedPets.length === filteredPets.length && filteredPets.length > 0}
                                                                onCheckedChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 w-16 text-center">Image</th>
                                                        <th className="px-4 py-3">Identity</th>
                                                        <th className="px-4 py-3">Details</th>
                                                        <th className="px-4 py-3">Pedigree</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {filteredPets.map(pet => (
                                                        <tr key={pet.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <Checkbox
                                                                    checked={selectedPets.includes(pet.id)}
                                                                    onCheckedChange={() => toggleSelectPet(pet.id)}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">

                                                                <img src={pet.image} alt="" className="w-8 h-8 rounded-full object-cover mx-auto ring-1 ring-gray-200" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-gray-900">{pet.name}</div>
                                                                <div className="text-xs text-gray-500 font-mono">{pet.registrationNumber || 'No ID'}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-gray-700">{pet.breed}</div>
                                                                <div className="text-xs text-gray-500 capitalize">{pet.gender} • {pet.type}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pet.parentIds?.sire ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>SIRE</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pet.parentIds?.dam ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-400'}`}>DAM</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => setEditingPet(pet)}>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => handleDeletePet(pet.id)}>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredPets.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                                No records found matching "{searchTerm}"
                                                            </td>
                                                        </tr>
                                                    )}

                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : activeTab === 'verifications' ? (
                            /* 3. VERIFICATIONS TAB */
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <h2 className="text-xl font-bold mb-4">Pending Pedigree Verifications</h2>
                                {pendingVerifications.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">No pending verifications found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingVerifications.map(pet => (
                                            <div key={pet.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4">
                                                <img src={pet.image} className="w-16 h-16 rounded-lg object-cover" />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg">{pet.name} <span className="text-sm font-normal text-gray-500">({pet.breed})</span></h4>
                                                    <p className="text-sm text-gray-600 mb-3">Requesting verification for parents:</p>
                                                    <div className="flex gap-4">
                                                        {pet.parentIds?.sire && pet.parentIds.sireStatus === 'pending' && (
                                                            <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                                <span className="text-xs font-bold text-blue-700 uppercase">Sire Connection</span>
                                                                <div className="text-sm font-mono">{pet.parentIds.sire}</div>
                                                                <div className="flex gap-1 ml-2">
                                                                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleVerify(pet.id, 'sire', 'verified')}>Approve</Button>
                                                                    <Button size="sm" variant="destructive" className="h-7" onClick={() => handleVerify(pet.id, 'sire', 'rejected')}>Reject</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {pet.parentIds?.dam && pet.parentIds.damStatus === 'pending' && (
                                                            <div className="flex items-center gap-3 bg-pink-50 p-2 rounded-lg border border-pink-100">
                                                                <span className="text-xs font-bold text-pink-700 uppercase">Dam Connection</span>
                                                                <div className="text-sm font-mono">{pet.parentIds.dam}</div>
                                                                <div className="flex gap-1 ml-2">
                                                                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleVerify(pet.id, 'dam', 'verified')}>Approve</Button>
                                                                    <Button size="sm" variant="destructive" className="h-7" onClick={() => handleVerify(pet.id, 'dam', 'rejected')}>Reject</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 4. USER MANAGEMENT TAB */
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-4 border-b flex gap-4 bg-gray-50/50">
                                    <div className="relative flex-1 max-w-md">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <Input
                                            placeholder="Search users..."
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                    <Button className="ml-auto bg-primary text-white shadow-sm hover:bg-primary/90">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add New User
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">User</th>
                                                    <th className="px-4 py-3">Role</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Joined</th>
                                                    <th className="px-4 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {[
                                                    { id: 1, name: 'Admin User', email: 'admin@petdegree.com', role: 'Administrator', status: 'Active', joined: '2023-01-15' },
                                                    { id: 2, name: 'John Doe', email: 'john@example.com', role: 'Breeder', status: 'Active', joined: '2023-03-10' },
                                                    { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Inactive', joined: '2023-05-22' },
                                                    { id: 4, name: 'Robert Johnson', email: 'rob@kennels.com', role: 'Breeder', status: 'Active', joined: '2023-06-01' },
                                                    { id: 5, name: 'Emily Davis', email: 'emily@davis.com', role: 'User', status: 'Active', joined: '2023-07-14' },
                                                ].map(user => (
                                                    <tr key={user.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900">{user.name}</div>
                                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'Administrator' ? 'bg-purple-100 text-purple-800' :
                                                                user.role === 'Breeder' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                <span className="text-gray-700">{user.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                            {user.joined}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AdminPanel;
