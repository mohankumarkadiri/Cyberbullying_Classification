import React from 'react';
import {
	createBrowserRouter,
	createRoutesFromElements,
	Route,
	RouterProvider
} from "react-router-dom";
import { Provider } from 'react-redux'
import ErrorBoundary from './common/ErrorBoundary';
import { SnackbarProvider } from './hooks/SnackBarProvider';
import FileUploadUI from './pages/FileUploadUI';
import TextExtractionUI from './pages/TextExtractionUI';
import PageNotFound from './common/PageNotFound';
import Layout from './Layout';
import store from './store';
import './App.css';

const router = createBrowserRouter(
	createRoutesFromElements(
		<Route>
			<Route path='/' element={<Layout />}>
				<Route path='fileUpload' element={<FileUploadUI />}></Route>
				<Route path='textExtraction' element={<TextExtractionUI />}></Route>
				<Route path='*' element={<PageNotFound />}></Route>
			</Route>
		</Route>
	)
);

export default function App() {
	return (
		<Provider store={store}>
			<SnackbarProvider>
				<ErrorBoundary>
					<RouterProvider router={router} />
				</ErrorBoundary>
			</SnackbarProvider>
		</Provider>
	);
}