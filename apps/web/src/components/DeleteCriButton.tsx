'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteCri } from '@/hooks/use-cris';

interface DeleteCriButtonProps {
  id: string;
  codigo: string;
}

export function DeleteCriButton({ id, codigo }: DeleteCriButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteCri();

  async function handleConfirm() {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('CRI removido');
      router.push('/cris');
    } catch (err) {
      toast.error('Erro ao remover', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Deletar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar este CRI?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O CRI <strong>{codigo}</strong> será
            removido permanentemente da base.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
