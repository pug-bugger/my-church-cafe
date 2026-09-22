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
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
	roleLabel,
	t as translate,
	useTranslation,
	type TranslateFn,
} from "@/i18n";
import { getAuthToken, getStoredUser } from "@/lib/auth";

const ROLES = ["admin", "personal", "parishioner"] as const;

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((p) => p[0])
		.join("")
		.slice(0, 2)
		.toUpperCase() || "?";
}

export function UserManagement() {
	const { t } = useTranslation();
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

	const loadUsers = useCallback(async () => {
		if (!apiUrl) {
			setListError(t("manage.user.missingApiUrl"));
			setLoading(false);
			return;
		}
		if (!getAuthToken()) {
			setListError(t("manage.user.signInAsStaff"));
			setLoading(false);
			setUsers([]);
			return;
		}
		setLoading(true);
		setListError(null);
		setViewerRole(getStoredUser<{ role?: string }>()?.role ?? null);
		try {
			const data = await apiFetch<ServerUser[]>("/api/users", { auth: true });
			setUsers(Array.isArray(data) ? data : []);
		} catch (e) {
			if (e instanceof ApiError && e.status === 403) {
				setListError(t("manage.user.noAccess"));
				setUsers([]);
				return;
			}
			setListError(
				e instanceof Error ? e.message : t("manage.user.loadFailed")
			);
			setUsers([]);
		} finally {
			setLoading(false);
		}
	}, [apiUrl, t]);

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
						{t("manage.user.title")}
					</CardTitle>
					<p className="text-sm text-muted-foreground font-normal mt-1">
						{t("manage.user.subtitle")}
					</p>
				</div>
				{isAdmin && (
					<Dialog open={addOpen} onOpenChange={setAddOpen}>
						<DialogTrigger asChild>
							<Button type="button" onClick={() => setAddOpen(true)}>
								<Plus className="h-4 w-4 mr-1" />
								{t("manage.user.addUser")}
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>{t("manage.user.newUser")}</DialogTitle>
								<DialogDescription>
									{t("manage.user.newUserDescription")}
								</DialogDescription>
							</DialogHeader>
							<UserForm
								t={t}
								mode="create"
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
						<AlertDescription>{t("manage.user.unavailable")}</AlertDescription>
					</Alert>
				)}
				{listError && (
					<Alert variant={users.length ? "default" : "destructive"}>
						<AlertDescription>{listError}</AlertDescription>
					</Alert>
				)}
				{loading ? (
					<p className="text-sm text-muted-foreground">
						{t("profile.users.loadingUsers")}
					</p>
				) : users.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{t("manage.user.none")}
					</p>
				) : (
					<div className="rounded-md border overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/50 text-left">
									<th className="p-3 font-medium w-14" />
									<th className="p-3 font-medium">{t("common.name")}</th>
									<th className="p-3 font-medium">{t("common.email")}</th>
									<th className="p-3 font-medium">
										{t("profile.account.role")}
									</th>
									<th className="p-3 font-medium hidden sm:table-cell">
										{t("profile.users.joined")}
									</th>
									{isAdmin && (
										<th className="p-3 font-medium w-28">
											{t("manage.user.actions")}
										</th>
									)}
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
										<td className="p-3">{roleLabel(u.role, t) || "—"}</td>
										<td className="p-3 text-muted-foreground hidden sm:table-cell">
											{u.created_at ? formatDate(u.created_at, {}) : "—"}
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
														aria-label={t("manage.user.editNamed", {
															name: u.name,
														})}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive"
														onClick={() => setDeleteUser(u)}
														aria-label={t("manage.user.deleteNamed", {
															name: u.name,
														})}
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
						<DialogTitle>{t("manage.user.editUser")}</DialogTitle>
						<DialogDescription>
							{t("manage.user.editUserDescription")}
						</DialogDescription>
					</DialogHeader>
					{editUser && (
						<UserForm
							key={editUser.id}
							t={t}
							mode="edit"
							initial={editUser}
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
						<AlertDialogTitle>{t("manage.user.deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("manage.user.deleteBody", { name: deleteUser?.name ?? "" })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={async () => {
								if (!deleteUser) return;
								try {
									await apiFetch(`/api/users/${deleteUser.id}`, {
										method: "DELETE",
										auth: true,
									});
									toast.success(t("manage.user.deleted"));
									setDeleteUser(null);
									loadUsers();
								} catch (err) {
									toast.error(
										err instanceof Error
											? err.message
											: t("manage.user.deleteFailed")
									);
								}
							}}
						>
							{t("common.delete")}
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
	onDone: () => void;
	onCancel: () => void;
	/** Passed down rather than re-read, so the form and its parent agree. */
	t: TranslateFn;
};

async function postUserAvatar(userId: number, file: File): Promise<void> {
	const fd = new FormData();
	fd.append("image", file);
	await apiFetch(`/api/users/${userId}/image`, {
		method: "POST",
		formData: fd,
		auth: true,
		authError: translate("manage.user.notSignedIn"),
	});
}

function UserForm({ mode, initial, onDone, onCancel, t }: UserFormProps) {
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
		setSubmitting(true);
		try {
			if (mode === "create") {
				if (!password.trim()) {
					toast.error(t("manage.user.passwordRequired"));
					return;
				}
				const data = await apiFetch<{ id?: number }>("/api/users", {
					method: "POST",
					body: {
						name: name.trim(),
						email: email.trim(),
						password,
						role,
					},
					auth: true,
				});
				const id = typeof data?.id === "number" ? data.id : null;
				if (imageFile && id != null) {
					try {
						await postUserAvatar(id, imageFile);
					} catch (uploadErr) {
						toast.error(
							uploadErr instanceof Error
								? uploadErr.message
								: t("manage.user.photoUploadFailed")
						);
					}
				}
				toast.success(t("manage.user.created"));
				onDone();
			} else if (initial) {
				const body: Record<string, unknown> = {
					name: name.trim(),
					email: email.trim(),
					role,
				};
				if (password.trim()) body.password = password.trim();
				if (clearPicture) body.picture_url = null;
				await apiFetch(`/api/users/${initial.id}`, {
					method: "PUT",
					body,
					auth: true,
				});
				if (imageFile) {
					await postUserAvatar(initial.id, imageFile);
				}
				toast.success(t("manage.user.updated"));
				onDone();
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : t("errors.generic")
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label>{t("manage.productForm.photo")}</Label>
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
								{t("profile.account.removePhoto")}
							</Button>
						)}
					</div>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="um-name">{t("common.name")}</Label>
				<Input
					id="um-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="um-email">{t("common.email")}</Label>
				<Input
					id="um-email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label>{t("profile.account.role")}</Label>
				<Select value={role} onValueChange={setRole}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ROLES.map((r) => (
							<SelectItem key={r} value={r}>
								{roleLabel(r, t)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{mode === "create" ? (
				<div className="space-y-2">
					<Label htmlFor="um-password">{t("common.password")}</Label>
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
					<Label htmlFor="um-password-new">
						{t("manage.user.newPasswordOptional")}
					</Label>
					<Input
						id="um-password-new"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder={t("manage.user.keepCurrentPassword")}
					/>
				</div>
			)}
			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={submitting}>
					{submitting
						? t("common.saving")
						: mode === "create"
							? t("manage.user.create")
							: t("common.save")}
				</Button>
			</div>
		</form>
	);
}
