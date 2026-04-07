"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import type { ServerUser } from "@/types";
import { resolveMediaUrl } from "@/lib/imageUrl";

const ROLES = ["admin", "personal", "parishioner"] as const;

function getToken(): string | null {
	if (typeof window === "undefined") return null;
	return (
		localStorage.getItem("token") ??
		localStorage.getItem("jwt") ??
		localStorage.getItem("accessToken")
	);
}

function getStoredRole(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem("user");
		if (!raw) return null;
		const u = JSON.parse(raw) as { role?: string };
		return u.role ?? null;
	} catch {
		return null;
	}
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((p) => p[0])
		.join("")
		.slice(0, 2)
		.toUpperCase() || "?";
}

export function UserManagement() {
	const apiUrl = useMemo(
		() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "",
		[]
	);
	const [users, setUsers] = useState<ServerUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [viewerRole, setViewerRole] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [editUser, setEditUser] = useState<ServerUser | null>(null);
	const [deleteUser, setDeleteUser] = useState<ServerUser | null>(null);

	const isAdmin = viewerRole === "admin";

	const authHeaders = useCallback((): HeadersInit => {
		const token = getToken();
		const h: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (token) h.Authorization = `Bearer ${token}`;
		return h;
	}, []);

	const loadUsers = useCallback(async () => {
		if (!apiUrl) {
			setListError("Missing NEXT_PUBLIC_API_URL.");
			setLoading(false);
			return;
		}
		const token = getToken();
		if (!token) {
			setListError("Sign in as staff to view users.");
			setLoading(false);
			setUsers([]);
			return;
		}
		setLoading(true);
		setListError(null);
		setViewerRole(getStoredRole());
		try {
			const res = await fetch(`${apiUrl}/api/users`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.status === 403) {
				setListError("You do not have access to the user list.");
				setUsers([]);
				return;
			}
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					typeof data?.error === "string" ? data.error : "Failed to load users"
				);
			}
			const data = (await res.json()) as ServerUser[];
			setUsers(Array.isArray(data) ? data : []);
		} catch (e) {
			setListError(e instanceof Error ? e.message : "Failed to load users");
			setUsers([]);
		} finally {
			setLoading(false);
		}
	}, [apiUrl]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		const onAuth = () => loadUsers();
		window.addEventListener("auth:token", onAuth);
		return () => window.removeEventListener("auth:token", onAuth);
	}, [loadUsers]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle className="flex items-center gap-2">
						<UserRound className="h-5 w-5" />
						Users
					</CardTitle>
					<p className="text-sm text-muted-foreground font-normal mt-1">
						Admins can create, edit, and delete users. Personal staff can view
						the directory.
					</p>
				</div>
				{isAdmin && (
					<Dialog open={addOpen} onOpenChange={setAddOpen}>
						<DialogTrigger asChild>
							<Button type="button" onClick={() => setAddOpen(true)}>
								<Plus className="h-4 w-4 mr-1" />
								Add user
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>New user</DialogTitle>
								<DialogDescription>
									Creates an account with a temporary password you share
									securely.
								</DialogDescription>
							</DialogHeader>
							<UserForm
								mode="create"
								apiUrl={apiUrl}
								authHeaders={authHeaders}
								onDone={() => {
									setAddOpen(false);
									loadUsers();
								}}
								onCancel={() => setAddOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{!apiUrl && (
					<Alert variant="destructive">
						<AlertDescription>
							Set NEXT_PUBLIC_API_URL to use user management.
						</AlertDescription>
					</Alert>
				)}
				{listError && (
					<Alert variant={users.length ? "default" : "destructive"}>
						<AlertDescription>{listError}</AlertDescription>
					</Alert>
				)}
				{loading ? (
					<p className="text-sm text-muted-foreground">Loading users…</p>
				) : users.length === 0 ? (
					<p className="text-sm text-muted-foreground">No users to show.</p>
				) : (
					<div className="rounded-md border overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/50 text-left">
									<th className="p-3 font-medium w-14" />
									<th className="p-3 font-medium">Name</th>
									<th className="p-3 font-medium">Email</th>
									<th className="p-3 font-medium">Role</th>
									<th className="p-3 font-medium hidden sm:table-cell">
										Joined
									</th>
									{isAdmin && <th className="p-3 font-medium w-28">Actions</th>}
								</tr>
							</thead>
							<tbody>
								{users.map((u) => (
									<tr key={u.id} className="border-b last:border-0">
										<td className="p-3">
											<Avatar className="h-9 w-9">
												{u.picture_url && (
													<>
														<AvatarImage
															src={resolveMediaUrl(u.picture_url ?? undefined)}
															alt=""
														/>
													</>
												)}
												<AvatarFallback className="text-xs">
													{initials(u.name)}
												</AvatarFallback>
											</Avatar>
										</td>
										<td className="p-3 font-medium">{u.name}</td>
										<td className="p-3 text-muted-foreground">{u.email}</td>
										<td className="p-3 capitalize">{u.role ?? "—"}</td>
										<td className="p-3 text-muted-foreground hidden sm:table-cell">
											{u.created_at
												? new Date(u.created_at).toLocaleDateString()
												: "—"}
										</td>
										{isAdmin && (
											<td className="p-3">
												<div className="flex gap-1">
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={() => setEditUser(u)}
														aria-label={`Edit ${u.name}`}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive"
														onClick={() => setDeleteUser(u)}
														aria-label={`Delete ${u.name}`}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>

			<Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Edit user</DialogTitle>
						<DialogDescription>
							Update profile, role, or set a new password (optional).
						</DialogDescription>
					</DialogHeader>
					{editUser && (
						<UserForm
							key={editUser.id}
							mode="edit"
							initial={editUser}
							apiUrl={apiUrl}
							authHeaders={authHeaders}
							onDone={() => {
								setEditUser(null);
								loadUsers();
							}}
							onCancel={() => setEditUser(null)}
						/>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteUser}
				onOpenChange={(o) => !o && setDeleteUser(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete user?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes{" "}
							<span className="font-medium text-foreground">
								{deleteUser?.name}
							</span>{" "}
							permanently. Orders history may still reference this user where
							applicable.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={async () => {
								if (!deleteUser || !apiUrl) return;
								const token = getToken();
								if (!token) return;
								try {
									const res = await fetch(
										`${apiUrl}/api/users/${deleteUser.id}`,
										{
											method: "DELETE",
											headers: { Authorization: `Bearer ${token}` },
										}
									);
									if (!res.ok) {
										const data = await res.json().catch(() => ({}));
										throw new Error(
											typeof data?.error === "string"
												? data.error
												: "Delete failed"
										);
									}
									toast.success("User deleted");
									setDeleteUser(null);
									loadUsers();
								} catch (err) {
									toast.error(
										err instanceof Error ? err.message : "Delete failed"
									);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

type UserFormProps = {
	mode: "create" | "edit";
	initial?: ServerUser;
	apiUrl: string;
	authHeaders: () => HeadersInit;
	onDone: () => void;
	onCancel: () => void;
};

async function postUserAvatar(
	apiUrl: string,
	userId: number,
	file: File
): Promise<void> {
	const token = getToken();
	if (!token) throw new Error("Not signed in");
	const fd = new FormData();
	fd.append("image", file);
	const res = await fetch(`${apiUrl}/api/users/${userId}/image`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: fd,
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			typeof data?.error === "string" ? data.error : "Upload failed"
		);
	}
}

function UserForm({
	mode,
	initial,
	apiUrl,
	authHeaders,
	onDone,
	onCancel,
}: UserFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<string>(
		initial?.role && ROLES.includes(initial.role as (typeof ROLES)[number])
			? initial.role!
			: "parishioner"
	);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [clearPicture, setClearPicture] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!imageFile) {
			setPreview(null);
			return;
		}
		const url = URL.createObjectURL(imageFile);
		setPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile]);

	const displaySrc =
		preview ??
		(initial?.picture_url && !clearPicture
			? resolveMediaUrl(initial.picture_url)
			: null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!apiUrl) {
			toast.error("Missing API URL");
			return;
		}
		setSubmitting(true);
		try {
			if (mode === "create") {
				if (!password.trim()) {
					toast.error("Password is required for new users");
					return;
				}
				const res = await fetch(`${apiUrl}/api/users`, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({
						name: name.trim(),
						email: email.trim(),
						password,
						role,
					}),
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(
						typeof data?.error === "string" ? data.error : "Create failed"
					);
				}
				const id = typeof data.id === "number" ? data.id : null;
				if (imageFile && id != null) {
					try {
						await postUserAvatar(apiUrl, id, imageFile);
					} catch (uploadErr) {
						toast.error(
							uploadErr instanceof Error
								? uploadErr.message
								: "User created but photo upload failed"
						);
					}
				}
				toast.success("User created");
				onDone();
			} else if (initial) {
				const body: Record<string, unknown> = {
					name: name.trim(),
					email: email.trim(),
					role,
				};
				if (password.trim()) body.password = password.trim();
				if (clearPicture) body.picture_url = null;
				const res = await fetch(`${apiUrl}/api/users/${initial.id}`, {
					method: "PUT",
					headers: authHeaders(),
					body: JSON.stringify(body),
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(
						typeof data?.error === "string" ? data.error : "Update failed"
					);
				}
				if (imageFile) {
					await postUserAvatar(apiUrl, initial.id, imageFile);
				}
				toast.success("User updated");
				onDone();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Request failed");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label>Photo</Label>
				<div className="flex items-center gap-4">
					<Avatar className="h-16 w-16">
						<AvatarImage src={displaySrc ?? undefined} alt="" />
						<AvatarFallback>{initials(name || "?")}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-2">
						<Input
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							onChange={(e) => {
								setClearPicture(false);
								setImageFile(e.target.files?.[0] ?? null);
							}}
						/>
						{mode === "edit" && initial?.picture_url && !imageFile && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setClearPicture(true);
									setImageFile(null);
								}}
							>
								Remove photo
							</Button>
						)}
					</div>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="um-name">Name</Label>
				<Input
					id="um-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="um-email">Email</Label>
				<Input
					id="um-email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label>Role</Label>
				<Select value={role} onValueChange={setRole}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ROLES.map((r) => (
							<SelectItem key={r} value={r} className="capitalize">
								{r}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{mode === "create" ? (
				<div className="space-y-2">
					<Label htmlFor="um-password">Password</Label>
					<Input
						id="um-password"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
			) : (
				<div className="space-y-2">
					<Label htmlFor="um-password-new">New password (optional)</Label>
					<Input
						id="um-password-new"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Leave blank to keep current"
					/>
				</div>
			)}
			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
				</Button>
			</div>
		</form>
	);
}
