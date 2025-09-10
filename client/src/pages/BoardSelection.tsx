import { useState } from "react";
import { Plus, Grid, Settings, Edit, Trash2, MoreVertical, User, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/auth/logout-button";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useProfileMode } from "@/hooks/useProfileMode";
import type { Board } from "@shared/schema";

const boardSchema = z.object({
  name: z.string().min(3, "O nome do board deve conter pelo menos 3 caracteres").trim(),
  description: z.string().optional(),
  color: z.string().default("#3b82f6"),
  createDefaultColumns: z.boolean().default(true).optional(),
});

type BoardFormData = z.infer<typeof boardSchema>;

export default function BoardSelection() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const { mode, isReadOnly, canCreate, canEdit, canDelete } = useProfileMode();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boardsResponse, isLoading } = useQuery<{
    data: Board[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>({
    queryKey: ["/api/boards"],
    retry: false,
  });

  // Extrair boards da resposta e garantir que seja um array
  const boards = boardsResponse?.data || [];

  const { user: currentUser } = useAuth();

  const createForm = useForm<BoardFormData>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
      createDefaultColumns: true,
    },
  });

  const editForm = useForm<BoardFormData>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
    },
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: BoardFormData) => {
      try {
        const response = await apiRequest("POST", "/api/boards", {
          ...data,
          createdById: currentUser?.id || "system",
        });
        return response.json();
      } catch (error: any) {
        // The apiRequest already handles the HTTP error and throws with the message
        // Re-throw with a more structured format for better error handling
        console.error("Original API error:", error);
        throw error;
      }
    },
    onSuccess: async (newBoard) => {
      // Force refresh da lista de boards
      await queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      await queryClient.refetchQueries({ queryKey: ["/api/boards"] });
      
      // Invalidate member count for the new board since creator is auto-added
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${newBoard.id}/member-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${newBoard.id}/members`] });
      
      setIsCreateOpen(false);
      createForm.reset();
      
      toast({
        title: "Board criado",
        description: "Novo board Kanban criado com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao criar board:", error);
      
      // Parse API error response for better user feedback
      let errorMessage = "Erro ao criar board. Tente novamente.";
      
      if (error?.message) {
        // Check if it's a validation error from the backend
        if (error.message.includes("O nome do board deve conter pelo menos 3 caracteres")) {
          errorMessage = "O nome do board deve conter pelo menos 3 caracteres.";
        } else if (error.message.includes("Invalid board data")) {
          errorMessage = "Dados do board inválidos. Verifique se todos os campos estão preenchidos corretamente.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro ao criar board",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Edit board mutation
  const editBoardMutation = useMutation({
    mutationFn: async (data: BoardFormData) => {
      if (!selectedBoard) throw new Error("No board selected");
      const response = await apiRequest("PATCH", `/api/boards/${selectedBoard.id}`, data);
      return response.json();
    },
    onSuccess: async () => {
      // 🔄 FORÇAR INVALIDAÇÃO COMPLETA - Corrigir problema de cache
      await queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      
      // 🚀 FORÇAR REFETCH IMEDIATO dos boards
      await queryClient.refetchQueries({ queryKey: ["/api/boards"] });
      
      setIsEditOpen(false);
      setSelectedBoard(null);
      editForm.reset();
      toast({
        title: "Board atualizado",
        description: "As informações do board foram atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBoard) throw new Error("No board selected");
      const response = await apiRequest("DELETE", `/api/boards/${selectedBoard.id}`);
      // DELETE may return 204 No Content
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: async () => {
      // 🔄 FORÇAR INVALIDAÇÃO COMPLETA - Corrigir problema de cache
      await queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      
      // 🚀 FORÇAR REFETCH IMEDIATO dos boards
      await queryClient.refetchQueries({ queryKey: ["/api/boards"] });
      
      console.log("🔄 [CACHE] Cache de boards invalidado e refeito");
      
      setIsDeleteOpen(false);
      setSelectedBoard(null);
      toast({
        title: "Board excluído",
        description: "O board foi excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Toggle board status mutation
  const toggleBoardStatusMutation = useMutation({
    mutationFn: async (board: Board) => {
      const newStatus = board.isActive === "true" ? "false" : "true";
      const response = await apiRequest("PATCH", `/api/boards/${board.id}`, {
        isActive: newStatus
      });
      return response.json();
    },
    onSuccess: async () => {
      // Force refresh da lista de boards
      await queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      await queryClient.refetchQueries({ queryKey: ["/api/boards"] });
      
      toast({
        title: "Status atualizado",
        description: "O status do board foi alterado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleToggleBoardStatus = (board: Board, event: React.MouseEvent) => {
    event.preventDefault(); // Evita navegar para o board
    event.stopPropagation(); // Evita propagação do clique
    toggleBoardStatusMutation.mutate(board);
  };

  const handleEditBoard = (board: Board) => {
    setSelectedBoard(board);
    editForm.reset({
      name: board.name,
      description: board.description || "",
      color: board.color,
    });
    setIsEditOpen(true);
  };

  const handleDeleteBoard = (board: Board) => {
    setSelectedBoard(board);
    setIsDeleteOpen(true);
  };

  const colorOptions = [
    { value: "#3b82f6", label: "Azul", class: "bg-blue-500" },
    { value: "#10b981", label: "Verde", class: "bg-green-500" },
    { value: "#f59e0b", label: "Laranja", class: "bg-orange-500" },
    { value: "#ef4444", label: "Vermelho", class: "bg-red-500" },
    { value: "#8b5cf6", label: "Roxo", class: "bg-purple-500" },
    { value: "#06b6d4", label: "Ciano", class: "bg-cyan-500" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Kanban
                </h1>
                {currentUser && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {currentUser.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Modo indicador discreto */}
              {isReadOnly && (
                <div className="flex items-center text-orange-600" title="Modo somente visualização">
                  <Eye className="w-4 h-4" />
                </div>
              )}
              
              {/* Botão criar - só para quem pode criar */}
              {canCreate("Boards") && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-board"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Board
                </Button>
              )}
              <LogoutButton size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Seus Boards
          </h2>
          <p className="text-xs text-muted-foreground">
            {isReadOnly 
              ? "Selecione um board para visualizar e analisar as tarefas."
              : "Selecione um board ou crie um novo."
            }
          </p>
        </div>

        {/* Boards Grid */}
        {boards && boards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum board encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crie seu primeiro board para começar a organizar suas tarefas.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-first-board"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards?.map((board) => (
              <Card
                key={board.id}
                className="p-6 hover:shadow-lg transition-shadow relative group"
                data-testid={`card-board-${board.id}`}
              >
                {/* Board Actions Menu - só para quem pode editar/excluir */}
                {(canEdit("Boards") || canDelete("Boards")) && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={(e) => e.preventDefault()}
                          data-testid={`dropdown-board-actions-${board.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit("Boards") && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditBoard(board);
                            }}
                            className="cursor-pointer"
                            data-testid={`menu-edit-board-${board.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete("Boards") && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteBoard(board);
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            data-testid={`menu-delete-board-${board.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                

                {/* Board Content - Clickable area */}
                <Link href={`/kanban/${board.id}`}>
                  <div className="cursor-pointer">
                    <div className="flex items-start justify-between mb-4 pr-8">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {board.name}
                        </h3>
                      </div>
                      <Badge 
                        variant="secondary" 
                        data-testid={`badge-status-${board.id}`}
                        className={`cursor-pointer transition-colors hover:opacity-80 ${
                          board.isActive === "true" 
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200" 
                            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                        }`}
                        onClick={(e) => handleToggleBoardStatus(board, e)}
                        title={`Clique para ${board.isActive === "true" ? "inativar" : "ativar"} o board`}
                      >
                        {board.isActive === "true" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    {board.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Criado em {new Date(board.createdAt || new Date()).toLocaleDateString("pt-BR")}
                      </span>
                      <Settings className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-board">
          <DialogHeader>
            <DialogTitle>Criar Novo Board</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie um board para organizar tarefas.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createBoardMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Board</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do board"
                        {...field}
                        data-testid="input-board-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição (opcional)"
                        rows={3}
                        {...field}
                        data-testid="textarea-board-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`w-8 h-8 rounded-full ${color.class} ${
                              field.value === color.value
                                ? "ring-2 ring-offset-2 ring-blue-500"
                                : "hover:scale-110"
                            } transition-all`}
                            title={color.label}
                            data-testid={`button-color-${color.value}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="createDefaultColumns"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-create-default-columns"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Criar colunas padrão
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Inclui as colunas: Backlog, To Do, In Progress, Review, Done
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createBoardMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-submit-create"
                >
                  {createBoardMutation.isPending ? "Criando..." : "Criar Board"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="edit-board-dialog">
          <DialogHeader>
            <DialogTitle>Editar Board</DialogTitle>
            <DialogDescription>
              Altere as informações do seu board.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editBoardMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Board</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do board..."
                        {...field}
                        data-testid="input-edit-board-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do board..."
                        className="min-h-[60px] resize-none"
                        {...field}
                        data-testid="input-edit-board-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do Board</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-6 gap-3">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`
                              w-10 h-10 rounded-lg border-2 transition-all
                              ${color.class}
                              ${field.value === color.value 
                                ? 'border-gray-900 scale-110' 
                                : 'border-gray-300 hover:border-gray-500'
                              }
                            `}
                            title={color.label}
                            data-testid={`edit-color-option-${color.label.toLowerCase()}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={editBoardMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editBoardMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editBoardMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Board Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="delete-board-dialog">
          <DialogHeader>
            <DialogTitle>Excluir Board</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o board "{selectedBoard?.name}"? 
              Esta ação é irreversível e todas as tarefas serão perdidas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteBoardMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteBoardMutation.mutate()}
              disabled={deleteBoardMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteBoardMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}