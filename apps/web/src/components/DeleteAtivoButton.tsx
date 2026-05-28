'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import type { TipoAtivo } from '@assets-db/shared';
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
import { useDeleteAtivo } from '@/hooks/use-ativos';

interface DeleteAtivoButtonProps {
  id: string;
  tipo: TipoAtivo;
  codigo: string;
}

export function DeleteAtivoButton({ id, tipo, codigo }: DeleteAtivoButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteAtivo();

  async function handleConfirm() {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`${tipo} removido`);
      router.push('/ativos');
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
          <AlertDialogTitle>Deletar este {tipo}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O {tipo} <strong>{codigo}</strong> será
            removido permanentemente da base, junto com todos os seus eventos.
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
