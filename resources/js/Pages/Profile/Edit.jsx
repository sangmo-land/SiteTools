import AuthenticatedLayout, { PageHeader } from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Account"
                    title="Profile settings"
                    description="Manage your account details, password, and workspace."
                />
            }
        >
            <Head title="Profile" />

            <div className="mx-auto max-w-3xl space-y-5">
                <div className="card p-6 sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="card p-6 sm:p-8">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                <div className="card border-rose-500/30 p-6 sm:p-8">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
