import {useAuth} from "react-oidc-context";

const BASE_URL = 'https://api.dropboxapi.com/2/files';

export interface SaveUrlResponse {
    path: string;
    url: string;
    timestamp?: number;
    id?: string;
    status?: JobStatusEnum
    error?: string;
}

export enum JobStatusEnum {
    Added = "added",
    InProgress = "in_progress",
    Complete = "complete",
    Failed = "failed",
}

export interface JobStatusResponse {
    status: JobStatusEnum
    error?: string
}
export const useDropboxApi = () => {
    const auth = useAuth();

    const saveUrl = async (path: string, url: string): Promise<SaveUrlResponse> => {
        const accessToken = auth.user!.access_token!;
        try {
            const callUrl = `${BASE_URL}/save_url?authorization=Bearer ${accessToken!}`;
            const response = await fetch(callUrl,{
                headers: { 'Content-Type': 'text/plain; charset=dropbox-cors-hack', },
                method: 'POST',
                body: JSON.stringify({path, url}),
            });
            if (response.status !== 200) {
                const error = await response.text();
                return { url, path, error, status: JobStatusEnum.Failed };
            }
            const respData = await response.json();
            return {
                url,
                path,
                id: respData.async_job_id,
                timestamp: Date.now(),
                ...(respData.error && { error: respData.error['.tag'], status: JobStatusEnum.Failed } || { status: JobStatusEnum.Added })
            };
        } catch (error) {
            console.error('Error saving URL to Dropbox:', error);
            throw error;
        }
    };

    const checkJobStatus = async (async_job_id: string): Promise<JobStatusResponse> => {
        const accessToken = auth.user!.access_token!;
        try {
            const callUrl = `${BASE_URL}/save_url/check_job_status?authorization=Bearer ${accessToken!}`;

            const response = await fetch(callUrl,{
                headers: { 'Content-Type': 'text/plain; charset=dropbox-cors-hack', },
                method: 'POST',
                body: JSON.stringify({async_job_id}),
            });
            const respData = await response.json();
            return {
                status: Object.values(JobStatusEnum).find(v => v === respData['.tag']) as JobStatusEnum | undefined,
                ...(respData.failed && { error: respData.failed['.tag'] })
            };
        } catch (error) {
            console.error('Error checking job status on Dropbox:', error);
            throw error;
        }
    };

    return { saveUrl, checkJobStatus };
};
