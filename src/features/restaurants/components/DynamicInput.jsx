import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { SimpleDialog } from '../../../components/ui/SimpleDialog';

const DynamicInput = ({ options, selectedOption, onSelect, onAdd, onEdit, onDelete, placeholder, title }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleAddNew = async () => {
    if (inputValue && !options.find(opt => opt.name.toLowerCase() === inputValue.toLowerCase())) {
      const newItem = await onAdd(inputValue);
      if (newItem) {
        onSelect(newItem);
        setInputValue('');
        setIsDialogOpen(false);
      }
    }
  };

  const handleEdit = async () => {
    if (inputValue && inputValue !== options.find(opt => opt.id === editingId).name) {
      await onEdit(editingId, inputValue);
      setEditingId(null);
      setInputValue('');
      setIsDialogOpen(false);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(editingId);
    setEditingId(null);
    setInputValue('');
    setIsDialogOpen(false);
    setIsEditing(false);
  };

  const openEditDialog = (option) => {
    setEditingId(option.id);
    setInputValue(option.name);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  return (
    <div className="mb-4">
      <Label className="mb-2 block font-bold text-sm">{title}</Label>
      <div className="flex overflow-x-auto pb-2 mb-2 -mx-4 px-4">
        <div className="flex space-x-2">
          {options.map((option) => (
            <div key={option.id} className="flex-shrink-0">
              <Button
                variant={selectedOption && selectedOption.id === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelect(option)}
                className="text-sm"
              >
                {option.name}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(option);
                  }}
                  className="ml-1 p-1"
                >
                  <Edit size={12} />
                </Button>
              </Button>
            </div>
          ))}
          <Button onClick={() => {setIsDialogOpen(true); setIsEditing(false);}} size="sm" variant="outline" className="flex-shrink-0 text-sm">
            <PlusCircle size={16} className="mr-2" /> Add New
          </Button>
        </div>
      </div>
      <SimpleDialog
        isOpen={isDialogOpen}
        onClose={() => {setIsDialogOpen(false); setIsEditing(false);}}
        title={isEditing ? `Edit ${title}` : `Add New ${title}`}
      >
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className="w-full text-sm mb-4"
        />
        <div className="flex justify-between">
          {isEditing ? (
            <>
              <Button onClick={handleDelete} variant="destructive" size="sm" className="w-[32%]">
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
              <Button onClick={() => {setIsDialogOpen(false); setIsEditing(false);}} variant="outline" size="sm" className="w-[32%]">
                Cancel
              </Button>
              <Button onClick={handleEdit} size="sm" className="w-[32%]">
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => {setInputValue(''); setIsDialogOpen(false);}} variant="outline" size="sm" className="w-[48%]">
                Cancel
              </Button>
              <Button onClick={handleAddNew} size="sm" className="w-[48%]">
                Save
              </Button>
            </>
          )}
        </div>
      </SimpleDialog>
    </div>
  );
};

export default DynamicInput;