import {type Dispatch, FormEvent, type SetStateAction, useCallback, useEffect, useState} from "react";
import { AppBar, Box, Button, Container, IconButton, TextField, Toolbar, Typography } from "@mui/material";
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { DataGrid, GridActionsCellItem, GridRowId, } from '@mui/x-data-grid';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from "react-oidc-context";
import {JobStatusEnum, SaveUrlResponse, useDropboxApi} from "./Dropbox";
import useLocalStorageState from 'use-local-storage-state';


const AppBarWithAuth = () => {
    const auth = useAuth();

    return (
        <AppBar position="sticky">
            <Toolbar>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Save to Dropbox
                </Typography>
                {auth.isAuthenticated ? (
                    <Button color="inherit" onClick={() => auth.removeUser()}>Log out</Button>
                ) : (
                    auth.isLoading ? (
                        <Button color="inherit">Loading</Button>
                    ) : (
                        <Button color="inherit" onClick={() => auth.signinRedirect()}>Connect to Dropbox</Button>
                    )
                )}
            </Toolbar>
        </AppBar>
    );
};

interface MainFormProps {
    tasks: {[key:string]:SaveUrlResponse};
    setTasks: Dispatch<SetStateAction<{[key:string]:SaveUrlResponse}>>;
}

const MainForm = ({ tasks, setTasks }: MainFormProps) => {
    const [path, setPath] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const { saveUrl } = useDropboxApi();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!path || !url) {
            setIsError(true);
            return;
        }
        setIsError(false);
        console.log("Path: ", path, "URL: ", url);
        try {
            const resp = await saveUrl(path, url);
            console.log(resp);
            if (resp.error) {
                alert("Error saving URL to Dropbox:\n" + resp.error);
            } else {
                setTasks({...tasks, [resp.id!]: resp});
            }
            setPath("");
            setUrl("");
        } catch (error) {
            console.error("Failed to save URL:", error);
            alert("Failed to save URL due to an unexpected error.");
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Typography component="h1" variant="h5" sx={{ mt: 4, mb: 2 }}>
                Add new download task
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="path"
                    label="File Path"
                    name="path"
                    autoComplete="file-path"
                    autoFocus
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    error={isError && path === ''}
                    helperText={isError && path === '' ? 'Path is required' : 'Enter the file path for Dropbox'}
                />
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="url"
                    label="Download URL"
                    name="url"
                    autoComplete="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    error={isError && url === ''}
                    helperText={isError && url === '' ? 'URL is required' : 'Enter the URL from which Dropbox will download the file'}
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                >
                    Submit
                </Button>
            </Box>
        </Container>
    );
};

const MainGrid = ({ tasks, setTasks } : MainFormProps) => {
    const { isAuthenticated } = useAuth();
    const { checkJobStatus } = useDropboxApi();
    const [selectionModel, setSelectionModel] = useState<GridRowId[]>([]);

    const handleDeleteClick = (id: GridRowId) => () => {
        const updatedTasks = { ...tasks };
        delete updatedTasks[id];
        setTasks(updatedTasks);
    };

    const updateTasks = useCallback(async () => {
        const results = await Promise.all(
            Object.entries(tasks).map(async ([id, task]) => {
                if ([JobStatusEnum.Added, JobStatusEnum.InProgress].includes(task.status!)) {
                    const status = await checkJobStatus(id);
                    if ([JobStatusEnum.Complete, JobStatusEnum.Failed].includes(status.status)) {
                        return { id, status };
                    }
                }
                return null;
            })
        );

        setTasks(prevTasks => results.reduce((acc, result) => {
            if (result) {
                acc[result.id] = { ...acc[result.id], ...result.status };
            }
            return acc;
        }, { ...prevTasks }));
    }, [checkJobStatus, tasks, setTasks]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(updateTasks, 4000);
        return () => clearInterval(interval);
    }, [isAuthenticated, updateTasks]);

    return (
        <>
            <DataGrid
                autoHeight
                rows={Object.values(tasks).map(task => ({ id: task.id, ...task }))}
                columns={[
                    { field: 'path', headerName: 'Path', flex: 4 },
                    { field: 'url', headerName: 'URL', flex: 4 },
                    { field: 'id', headerName: 'JobID', flex: 2 },
                    { field: 'status', headerName: 'Status', flex: 1 },
                    { field: 'error', headerName: 'Error', flex: 1 },
                    {
                        field: 'actions',
                        type: 'actions',
                        headerName: 'Actions',
                        flex: 1,
                        cellClassName: 'actions',
                        getActions: ({id}) => {
                            return [
                                <GridActionsCellItem
                                    icon={<DeleteIcon/>}
                                    label="Delete"
                                    onClick={handleDeleteClick(id)}
                                    color="inherit"
                                />,
                            ];
                        }
                    },
                ]}
                pageSizeOptions={[5, 10]}
                initialState={{pagination: { paginationModel: { pageSize: 5 } },}}
                onRowSelectionModelChange={(newSelectionModel) => {
                    setSelectionModel(newSelectionModel);
                }}
                rowSelectionModel={selectionModel}
            />
        </>
    );
};

const App = () => {
    const [tasks, setTasks] = useLocalStorageState<{[key:string]:SaveUrlResponse}>('tasks', {
        defaultValue: {}
    });

    return (
        <>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <AppBarWithAuth />
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <MainForm tasks={tasks} setTasks={setTasks}/>
                </Box>
                <Box sx={{ flexGrow: 0 }}>
                    <MainGrid tasks={tasks} setTasks={setTasks}/>
                </Box>
            </Box>
        </>
    );
}

export default App;
